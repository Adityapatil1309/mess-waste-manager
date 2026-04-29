import sqlite3
import os

DB_PATH = "/Users/pruthvi.chavan/Downloads/Messwastemanager/backend/mess_management.db"

def migrate():
    if not os.path.exists(DB_PATH):
        print("Database not found")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Get current columns
    cursor.execute("PRAGMA table_info(food_cooked)")
    columns = [col[1] for col in cursor.fetchall()]
    print(f"Current columns in food_cooked: {columns}")

    new_columns = [
        ("wheat_kg", "FLOAT DEFAULT 0"),
        ("milk_liters", "FLOAT DEFAULT 0"),
        ("eggs_units", "FLOAT DEFAULT 0"),
        ("poha_kg", "FLOAT DEFAULT 0"),
        ("curd_kg", "FLOAT DEFAULT 0"),
        ("oil_liters", "FLOAT DEFAULT 0")
    ]

    for col_name, col_type in new_columns:
        if col_name not in columns:
            print(f"Adding column {col_name}...")
            cursor.execute(f"ALTER TABLE food_cooked ADD COLUMN {col_name} {col_type}")
    
    conn.commit()
    conn.close()
    print("Migration complete!")

if __name__ == "__main__":
    migrate()
