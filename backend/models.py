"""
SQLAlchemy ORM model for Recipe.
"""

from sqlalchemy import Column, Integer, String, JSON, DateTime
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()


class Recipe(Base):
    __tablename__ = "recipes"

    id = Column(Integer, primary_key=True, index=True)
    url = Column(String, unique=True, nullable=False)
    title = Column(String, nullable=False)
    cuisine = Column(String)
    prep_time = Column(String)
    cook_time = Column(String)
    total_time = Column(String)
    servings = Column(Integer)
    difficulty = Column(String)
    ingredients = Column(JSON)          # list of {quantity, unit, item}
    instructions = Column(JSON)         # list of strings
    nutrition_estimate = Column(JSON)   # {calories, protein, carbs, fat}
    substitutions = Column(JSON)        # list of strings
    shopping_list = Column(JSON)        # {category: [items]}
    related_recipes = Column(JSON)      # list of strings
    created_at = Column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "url": self.url,
            "title": self.title,
            "cuisine": self.cuisine,
            "prep_time": self.prep_time,
            "cook_time": self.cook_time,
            "total_time": self.total_time,
            "servings": self.servings,
            "difficulty": self.difficulty,
            "ingredients": self.ingredients,
            "instructions": self.instructions,
            "nutrition_estimate": self.nutrition_estimate,
            "substitutions": self.substitutions,
            "shopping_list": self.shopping_list,
            "related_recipes": self.related_recipes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
