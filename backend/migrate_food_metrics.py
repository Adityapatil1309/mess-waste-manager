import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load env from backend directory
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/mess_waste_db"
)

def migrate():
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        print(f"Connected to {DATABASE_URL}")
        
        try:
            print("Adding 'metrics' column to 'food_cooked' table...")
            # Use JSONB for Postgres if possible, or just JSON
            # Since models.py uses JSON, we'll use JSON
            conn.execute(text("ALTER TABLE food_cooked ADD COLUMN metrics JSON"))
            conn.commit()
            print("Success: 'metrics' column added.")
        except Exception as e:
            if "already exists" in str(e).lower():
                print("Column 'metrics' already exists. Skipping.")
            else:
                print(f"Error adding metrics: {e}")

    print("Migration complete!")

if __name__ == "__main__":
    migrate()
