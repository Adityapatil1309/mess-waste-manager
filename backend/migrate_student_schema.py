import os
import sys

from sqlalchemy import create_engine, text

# Change to the backend directory
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import DATABASE_URL, engine

def run_migration():
    print("Starting manual database migration for student integration...")
    
    with engine.connect() as conn:
        # Commit the default implicit transaction first
        conn.commit()

        # 1. Add roll_number to users if it doesn't exist
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN roll_number VARCHAR(50);"))
            conn.commit()
            print("🟢 Added roll_number column to users table.")
        except Exception as e:
            conn.rollback()
            if "duplicate column name" in str(e).lower() or "already exists" in str(e).lower():
                print("🔵 roll_number column already exists.")
            else:
                print(f"⚠️ Could not add roll_number: {e}")

        # 2. Add hostel_block to users if it doesn't exist
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN hostel_block VARCHAR(50);"))
            conn.commit()
            print("🟢 Added hostel_block column to users table.")
        except Exception as e:
            conn.rollback()
            if "duplicate column name" in str(e).lower() or "already exists" in str(e).lower():
                print("🔵 hostel_block column already exists.")
            else:
                print(f"⚠️ Could not add hostel_block: {e}")

        # 3. Update UserRole enum if in PostgreSQL
        if "postgresql" in DATABASE_URL:
            try:
                # Need to run outside a transaction block for ALTER TYPE
                conn.execute(text("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'student';"))
                conn.commit()
                print("🟢 Added 'student' to userrole enum in PostgreSQL.")
            except Exception as e:
                conn.rollback()
                print(f"🔵 student role might already be in userrole enum or error: {e}")

        print("✅ Migration completed successfully!")

if __name__ == "__main__":
    run_migration()
