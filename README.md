# RecipeLens — Recipe Extractor & Meal Planner

A full-stack app that scrapes any recipe blog URL, extracts structured data using the **Groq free API (Llama 3.1)**, stores it in PostgreSQL, and serves it via a clean frontend.

---

## Screenshots

### Tab 1 — Extract Recipe (Before)
<p align="center">
  <img src="screenshots/tab1_before.png" width="600"/>
</p>

### Tab 1 — Extract Recipe (After)
<p align="center">
  <img src="screenshots/tab1_after.png" width="600"/>
</p>

### Tab 2 — Saved Recipes
<p align="center">
  <img src="screenshots/tab2_history.png" width="600"/>
</p>

### Details Modal
<p align="center">
  <img src="screenshots/tab3_modal.png" width="600"/>
</p>

---

## Project Structure

```
recipe_extractor/
├── backend/
│   ├── main.py          # FastAPI app + endpoints
│   ├── models.py        # SQLAlchemy ORM model
│   ├── database.py      # DB connection
│   ├── crud.py          # DB operations
│   └── requirements.txt
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── script.js
├── screenshots/
│   ├── tab1_before.png
│   ├── tab1_after.png
│   ├── tab2_history.png
│   └── tab3_modal.png
├── sample_data/
│   ├── urls.md
│   └── grilled_cheese_output.json
├── prompts/
│   └── prompt_templates.md
└── README.md
```

---

## Setup

### 1. PostgreSQL

- Download and install PostgreSQL 17 from [postgresql.org/download](https://postgresql.org/download)
- During installation set a password for the `postgres` user
- After installation open **pgAdmin** → right click **recipe_db** → **Query Tool** and run:

```sql
CREATE DATABASE recipe_db;
```

### 2. Get a Free Groq API Key

- Go to [console.groq.com](https://console.groq.com)
- Sign up → API Keys → Create API Key
- Copy the key (starts with `gsk_`)

### 3. Install Python Dependencies

```cmd
cd path\to\recipe_extractor\backend
pip install -r requirements.txt
```

### 4. Start the Backend

Run these commands in your terminal (PowerShell):

```cmd
$env:GROQ_API_KEY="your-groq-api-key-here"
$env:DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@127.0.0.1:5432/recipe_db"
uvicorn main:app --reload --port 8080 --host 0.0.0.0
```

You should see:
```
INFO: Uvicorn running on http://127.0.0.1:8080
INFO: Application startup complete.
```

### 5. Open the Frontend

- Open `frontend/index.html` directly in your browser (double-click it)
- Make sure `script.js` line 6 has:
```js
const API_BASE = "http://127.0.0.1:8080";
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/extract` | Scrape URL, extract recipe, store in DB |
| `GET` | `/api/recipes` | List all saved recipes |
| `GET` | `/api/recipes/{id}` | Get a single recipe by ID |
| `DELETE` | `/api/recipes/{id}` | Delete a recipe |
| `POST` | `/api/meal-plan` | Generate combined meal plan for 3–5 recipe IDs |

You can test all endpoints at:
```
http://127.0.0.1:8080/docs
```

### POST /api/extract

**Request:**
```json
{ "url": "https://www.allrecipes.com/recipe/23891/grilled-cheese-sandwich/" }
```

**Response:** Full recipe JSON (see `sample_data/grilled_cheese_output.json`)

### POST /api/meal-plan

**Request:**
```json
{ "recipe_ids": [1, 2, 3] }
```

**Response:**
```json
{
  "meal_plan_title": "...",
  "recipes_included": ["Recipe A", "Recipe B", "Recipe C"],
  "combined_shopping_list": { "dairy": [...], ... },
  "tips": ["..."]
}
```

---

## Testing

1. Start the backend with the commands in Step 4
2. Open `frontend/index.html` in your browser
3. Paste a URL from `sample_data/urls.md` into Tab 1 and click **Extract**
4. Wait 10–20 seconds for scraping + AI extraction
5. Switch to **Saved Recipes** (Tab 2) to see history
6. Go to **Meal Planner** (Tab 3), select 3–5 recipes, click **Generate Meal Plan**

### Test URLs

```
https://www.allrecipes.com/recipe/23891/grilled-cheese-sandwich/
https://www.allrecipes.com/recipe/16354/easy-meatloaf/
https://www.simplyrecipes.com/recipes/carbonara/
```

---

## Important Notes

- Every time you open a new terminal you must set the environment variables again with `$env:` commands
- Backend runs on port **8080** (not 8000)
- The `script.js` file must have `API_BASE = "http://127.0.0.1:8080"`
- Allrecipes and some sites may be slow to scrape — wait up to 30 seconds
- Duplicate URLs return cached results from DB instead of re-scraping

---

## Error Handling

- Invalid / unreachable URLs → HTTP 400 with descriptive message
- Non-recipe pages → LLM returns best-effort extraction; fields may be null
- LLM JSON parse failure → HTTP 500 with detail
- Duplicate URLs → Returns cached DB result instead of re-scraping
- DB errors → Propagated as HTTP 500

---

## LLM

Uses **Llama 3.1 8B Instant** via the **Groq free API**.
Free tier limits: 15 requests/min, 1500 requests/day — more than enough for this project.
