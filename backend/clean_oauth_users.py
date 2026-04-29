import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
from models import User

def clean_oauth_users():
    db = SessionLocal()
    try:
        users = db.query(User).filter(User.provider == "google").all()
        count = len(users)
        for u in users:
            print(f"Deleting user: {u.email} (Role: {u.role})")
            db.delete(u)
        db.commit()
        print(f"✅ Successfully deleted {count} test Google users from the database.")
    except Exception as e:
        db.rollback()
        print(f"❌ Error deleting users: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    clean_oauth_users()
