"""
CRUD helpers — keep all DB logic here, away from route handlers.
"""

from sqlalchemy.orm import Session
from models import Recipe


def get_recipe_by_url(db: Session, url: str) -> Recipe | None:
    return db.query(Recipe).filter(Recipe.url == url).first()


def get_recipe_by_id(db: Session, recipe_id: int) -> Recipe | None:
    return db.query(Recipe).filter(Recipe.id == recipe_id).first()


def get_all_recipes(db: Session) -> list[Recipe]:
    return db.query(Recipe).order_by(Recipe.created_at.desc()).all()


def create_recipe(db: Session, url: str, data: dict) -> Recipe:
    recipe = Recipe(
        url=url,
        title=data.get("title", "Untitled"),
        cuisine=data.get("cuisine"),
        prep_time=data.get("prep_time"),
        cook_time=data.get("cook_time"),
        total_time=data.get("total_time"),
        servings=data.get("servings"),
        difficulty=data.get("difficulty"),
        ingredients=data.get("ingredients", []),
        instructions=data.get("instructions", []),
        nutrition_estimate=data.get("nutrition_estimate", {}),
        substitutions=data.get("substitutions", []),
        shopping_list=data.get("shopping_list", {}),
        related_recipes=data.get("related_recipes", []),
    )
    db.add(recipe)
    db.commit()
    db.refresh(recipe)
    return recipe


def delete_recipe(db: Session, recipe_id: int) -> bool:
    recipe = get_recipe_by_id(db, recipe_id)
    if not recipe:
        return False
    db.delete(recipe)
    db.commit()
    return True
