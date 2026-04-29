import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text
from database import engine

def run():
    print("Migrating hostel_block to organization_code...")
    with engine.begin() as conn:
        try:
            conn.execute(text("ALTER TABLE users RENAME COLUMN hostel_block TO organization_code;"))
            print("🟢 Renamed successfully!")
        except Exception as e:
            print(f"🔵 RENAME failed or column already renamed: {e}")

if __name__ == "__main__":
    run()
