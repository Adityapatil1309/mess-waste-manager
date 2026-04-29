import asyncio
from database import SessionLocal
from models import User, Menu
import datetime

db = SessionLocal()
user = db.query(User).filter(User.role == "mess_manager").first()
print(f"Manager found: {user.email}, org: {user.organization_code}")

menu = Menu(
    date=datetime.date.today(),
    organization_code=user.organization_code,
    breakfast="Test",
    lunch="Test",
    dinner="Test"
)
db.add(menu)
try:
    db.commit()
    print("Success")
except Exception as e:
    print(f"Error: {e}")

