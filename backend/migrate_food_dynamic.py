import sys
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("DATABASE_URL not found in .env")
    sys.exit(1)

# Handle potential postgresql:// vs postgresql+psycopg2://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)

def migrate():
    with engine.connect() as conn:
        print("Checking for 'items' column in 'food_cooked' table...")
        
        # 1. Add the column if it doesn't exist
        try:
            conn.execute(text("ALTER TABLE food_cooked ADD COLUMN items JSON;"))
            conn.commit()
            print("Successfully added 'items' column.")
        except Exception as e:
            if "already exists" in str(e):
                print("Column 'items' already exists. Skipping add.")
            else:
                print(f"Error adding column: {e}")
                return

        # 2. Migrate existing data into the JSON object
        print("Migrating existing data into JSON 'items' field...")
        try:
            # We'll construct the JSON object from existing columns
            # PostgreSQL syntax for creating JSON from columns
            migration_query = """
            UPDATE food_cooked 
            SET items = json_build_object(
                'rice_kg', rice_kg,
                'wheat_kg', wheat_kg,
                'dal_kg', dal_kg,
                'vegetables_kg', vegetables_kg,
                'milk_liters', milk_liters,
                'eggs_units', eggs_units,
                'poha_kg', poha_kg,
                'curd_kg', curd_kg,
                'oil_liters', oil_liters,
                'chapati_count', chapati_count
            )
            WHERE items IS NULL;
            """
            conn.execute(text(migration_query))
            conn.commit()
            print("Successfully migrated existing data to 'items' column.")
        except Exception as e:
            print(f"Error migrating data: {e}")

if __name__ == "__main__":
    migrate()
