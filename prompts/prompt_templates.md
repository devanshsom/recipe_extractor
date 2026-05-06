# Prompt Templates

These are the prompt templates used in the backend (`main.py`) with the Gemini free API.

---

## 1. Recipe Extraction Prompt

**Purpose:** Extract structured recipe data from raw scraped webpage text.

```
You are a recipe data extraction specialist. Given the raw text scraped from a recipe webpage, extract ALL recipe information and return ONLY valid JSON (no markdown, no explanation).

SCRAPED TEXT:
{scraped_text}

SOURCE URL: {url}

Return this exact JSON structure (fill every field; use null if info is unavailable):
{
  "title": "string",
  "cuisine": "string",
  "prep_time": "string",
  "cook_time": "string",
  "total_time": "string",
  "servings": number,
  "difficulty": "easy|medium|hard",
  "ingredients": [
    {"quantity": "string", "unit": "string", "item": "string"}
  ],
  "instructions": ["step string"],
  "nutrition_estimate": {
    "calories": number,
    "protein": "string",
    "carbs": "string",
    "fat": "string"
  },
  "substitutions": ["substitution string (max 3)"],
  "shopping_list": {
    "dairy": [],
    "produce": [],
    "pantry": [],
    "bakery": [],
    "meat": [],
    "other": []
  },
  "related_recipes": ["recipe name (exactly 3)"]
}

Rules:
- difficulty: estimate from number of steps and techniques
- nutrition_estimate: approximate based on ingredients; do not hallucinate extreme values
- substitutions: exactly 3, practical and useful
- related_recipes: exactly 3 dishes that pair well
- shopping_list: categorize every ingredient
- Return ONLY the JSON object, nothing else
```

---

## 2. Meal Plan Prompt

**Purpose:** Generate a combined shopping list for 3–5 selected recipes.

```
You are a meal planning assistant. Given the following list of recipes with their ingredients, generate a COMBINED shopping list with merged quantities where possible.

RECIPES:
{recipes_json}

Return ONLY valid JSON (no markdown):
{
  "meal_plan_title": "string",
  "recipes_included": ["title1", "title2"],
  "combined_shopping_list": {
    "dairy": ["item with quantity"],
    "produce": ["item with quantity"],
    "pantry": ["item with quantity"],
    "bakery": ["item with quantity"],
    "meat": ["item with quantity"],
    "other": ["item with quantity"]
  },
  "tips": ["cooking tip string (max 3)"]
}
```

---

## Design Notes

- **Grounding:** Prompts explicitly instruct the model to base outputs on the scraped text, minimizing hallucination.
- **JSON-only output:** Both prompts mandate JSON-only responses to simplify parsing.
- **Structured fields:** Ingredients are split into `quantity`, `unit`, `item` to enable merging in meal planning.
- **Constraints:** Hard limits on counts (3 substitutions, 3 related recipes) keep outputs predictable.