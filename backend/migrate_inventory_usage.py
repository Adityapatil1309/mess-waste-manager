from database import engine
from sqlalchemy import text

def migrate():
    with engine.connect() as conn:
        print("Checking for daily_usage column in inventory table...")
        try:
            # Check if column exists (PostgreSQL syntax)
            result = conn.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='inventory' AND column_name='daily_usage';
            """))
            if not result.fetchone():
                print("Adding daily_usage column...")
                conn.execute(text("ALTER TABLE inventory ADD COLUMN daily_usage FLOAT DEFAULT 0;"))
                conn.commit()
                print("Column added successfully!")
            else:
                print("Column already exists.")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    migrate()
