import asyncio
from database import engine, SessionLocal
from sqlalchemy import text
from models import Base

# Create missing tables (organizations)
Base.metadata.create_all(bind=engine)

# Add column to users
with engine.begin() as conn:
    try:
        conn.execute(text("ALTER TABLE users ADD COLUMN organization_id INTEGER REFERENCES organizations(id);"))
        print("Added organization_id to users.")
    except Exception as e:
        print(f"Column might already exist or error: {e}")

