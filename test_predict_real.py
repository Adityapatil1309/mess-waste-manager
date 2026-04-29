import asyncio
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.database import Base
from backend.ml.predict import predict_attendance
from datetime import date

engine = create_engine("sqlite:///backend/mess_waste.db")
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

print(predict_attendance(date.today(), db, "lunch", "ORG123"))
