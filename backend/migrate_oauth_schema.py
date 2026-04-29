import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text
from database import engine

def run_migration():
    print("Starting manual database migration for OAuth integration...")
    
    with engine.connect() as conn:
        conn.commit()

        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN profile_image VARCHAR(500);"))
            conn.commit()
            print("🟢 Added profile_image column")
        except Exception:
            conn.rollback()
            print("🔵 profile_image column already exists")

        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN provider VARCHAR(50) DEFAULT 'local';"))
            conn.commit()
            print("🟢 Added provider column")
        except Exception:
            conn.rollback()
            print("🔵 provider column already exists")

        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN provider_id VARCHAR(255);"))
            conn.commit()
            print("🟢 Added provider_id column")
        except Exception:
            conn.rollback()
            print("🔵 provider_id column already exists")

    print("✅ Migration completed successfully!")

if __name__ == "__main__":
    run_migration()
