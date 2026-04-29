import asyncio
import sys
import os

# Ensure backend directory is in the python path
sys.path.append(os.path.join(os.path.dirname(__file__), "backend"))

from backend.database import SessionLocal
from backend.ml.predict import predict_attendance
from datetime import date

db = SessionLocal()

try:
    result = predict_attendance(date.today(), db, "lunch", "ORG123")
    print("SUCCESS")
    print(result)
except Exception as e:
    print("ERROR")
    import traceback
    traceback.print_exc()
