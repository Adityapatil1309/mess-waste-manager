import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text
from database import engine

def migrate():
    print("Migrating all tracking tables to include organization_code...")
    tables = ["attendance", "food_cooked", "waste", "inventory", "predictions"]
    
    with engine.begin() as conn:
        for table in tables:
            try:
                # Add organization_code as a foreign key / association if it had a separate Org table, 
                # but since we're using a string mapping for flexibility, we'll just use a String column.
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN organization_code VARCHAR(50);"))
                print(f"🟢 Added organization_code to {table}")
            except Exception as e:
                print(f"🔵 Skipped {table}: {e}")

if __name__ == "__main__":
    migrate()
