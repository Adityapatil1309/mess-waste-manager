import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/mess_waste_db"
)

def migrate():
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        print(f"Connected to {DATABASE_URL}")
        
        new_columns = [
            ("wheat_kg", "FLOAT DEFAULT 0"),
            ("milk_liters", "FLOAT DEFAULT 0"),
            ("eggs_units", "FLOAT DEFAULT 0"),
            ("poha_kg", "FLOAT DEFAULT 0"),
            ("curd_kg", "FLOAT DEFAULT 0"),
            ("oil_liters", "FLOAT DEFAULT 0")
        ]

        for col_name, col_type in new_columns:
            try:
                print(f"Adding column {col_name}...")
                conn.execute(text(f"ALTER TABLE food_cooked ADD COLUMN {col_name} {col_type}"))
                conn.commit()
            except Exception as e:
                if "already exists" in str(e).lower():
                    print(f"Column {col_name} already exists. Skipping.")
                else:
                    print(f"Error adding {col_name}: {e}")

    print("Migration complete!")

if __name__ == "__main__":
    migrate()
