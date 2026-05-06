from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import json
import re
import os
import requests
from bs4 import BeautifulSoup

from database import SessionLocal, engine
import models
import crud

# Load .env file automatically
load_dotenv()

# Create DB tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Recipe Extractor API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Schemas ─────────────────────────────────────────

class ExtractRequest(BaseModel):
    url: str

class MealPlanRequest(BaseModel):
    recipe_ids: list[int]

# ─── Scraper ─────────────────────────────────────────

def scrape_page(url: str) -> str:
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Accept-Language": "en-US,en;q=0.9",
    }
    try:
        resp = requests.get(url, headers=headers, timeout=15)
        resp.raise_for_status()
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch URL: {e}")

    soup = BeautifulSoup(resp.text, "html.parser")
    for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
        tag.decompose()

    text = soup.get_text(separator="\n", strip=True)
    return text[:6000]

# ─── Groq LLM Call ───────────────────────────────────

def call_llm(prompt: str) -> dict:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY not found in .env file")

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": "llama-3.1-8b-instant",
        "messages": [
            {
                "role": "system",
                "content": "You are a helpful assistant that returns ONLY valid JSON. No markdown, no explanation, just the JSON object."
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        "temperature": 0.2,
        "max_tokens": 2000
    }

    try:
        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=30
        )
        response.raise_for_status()
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"LLM API error: {e}")

    data = response.json()

    try:
        text = data["choices"][0]["message"]["content"]
    except Exception:
        raise HTTPException(status_code=500, detail=f"Invalid LLM response: {data}")

    text = re.sub(r"^```json\s*", "", text)
    text = re.sub(r"```$", "", text.strip())

    return json.loads(text)

# ─── Prompts ─────────────────────────────────────────

RECIPE_EXTRACTION_PROMPT = """
You are a recipe data extraction specialist. Given the raw text scraped from a recipe webpage, extract ALL recipe information and return ONLY valid JSON (no markdown, no explanation).

SCRAPED TEXT:
{scraped_text}

SOURCE URL: {url}

Return this exact JSON structure:
{{
  "title": "string",
  "cuisine": "string",
  "prep_time": "string",
  "cook_time": "string",
  "total_time": "string",
  "servings": number,
  "difficulty": "easy|medium|hard",
  "ingredients": [
    {{"quantity": "string", "unit": "string", "item": "string"}}
  ],
  "instructions": ["step string"],
  "nutrition_estimate": {{
    "calories": number,
    "protein": "string",
    "carbs": "string",
    "fat": "string"
  }},
  "substitutions": ["substitution string"],
  "shopping_list": {{
    "dairy": [],
    "produce": [],
    "pantry": [],
    "bakery": [],
    "meat": [],
    "other": []
  }},
  "related_recipes": ["recipe name"]
}}

Rules:
- difficulty: estimate from number of steps and techniques
- nutrition_estimate: approximate based on ingredients
- substitutions: exactly 3, practical and useful
- related_recipes: exactly 3 dishes that pair well
- shopping_list: categorize every ingredient
- Return ONLY the JSON object, nothing else
"""

MEAL_PLAN_PROMPT = """
You are a meal planning assistant. Given the following recipes, generate a combined shopping list with merged quantities where possible.

RECIPES:
{recipes_json}

Return ONLY valid JSON (no markdown):
{{
  "meal_plan_title": "string",
  "recipes_included": ["title1", "title2"],
  "combined_shopping_list": {{
    "dairy": [],
    "produce": [],
    "pantry": [],
    "bakery": [],
    "meat": [],
    "other": []
  }},
  "tips": ["tip"]
}}
"""

# ─── API Routes ──────────────────────────────────────

@app.post("/api/extract")
def extract_recipe(req: ExtractRequest):
    db = SessionLocal()
    try:
        existing = crud.get_recipe_by_url(db, req.url)
        if existing:
            return existing.to_dict()

        scraped_text = scrape_page(req.url)
        prompt = RECIPE_EXTRACTION_PROMPT.format(scraped_text=scraped_text, url=req.url)
        data = call_llm(prompt)
        recipe = crud.create_recipe(db, req.url, data)
        return recipe.to_dict()

    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Invalid JSON from LLM")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()


@app.get("/api/recipes")
def list_recipes():
    db = SessionLocal()
    try:
        return [r.to_dict() for r in crud.get_all_recipes(db)]
    finally:
        db.close()


@app.get("/api/recipes/{recipe_id}")
def get_recipe(recipe_id: int):
    db = SessionLocal()
    try:
        recipe = crud.get_recipe_by_id(db, recipe_id)
        if not recipe:
            raise HTTPException(status_code=404, detail="Recipe not found")
        return recipe.to_dict()
    finally:
        db.close()


@app.post("/api/meal-plan")
def generate_meal_plan(req: MealPlanRequest):
    db = SessionLocal()
    try:
        recipes = [crud.get_recipe_by_id(db, rid) for rid in req.recipe_ids]
        recipe_data = [{"title": r.title, "ingredients": r.ingredients} for r in recipes if r]
        prompt = MEAL_PLAN_PROMPT.format(recipes_json=json.dumps(recipe_data, indent=2))
        return call_llm(prompt)
    finally:
        db.close()


@app.delete("/api/recipes/{recipe_id}")
def delete_recipe(recipe_id: int):
    db = SessionLocal()
    try:
        ok = crud.delete_recipe(db, recipe_id)
        if not ok:
            raise HTTPException(status_code=404, detail="Recipe not found")
        return {"message": "Deleted"}
    finally:
        db.close()