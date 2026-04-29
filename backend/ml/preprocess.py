from datetime import date
import pandas as pd
from sqlalchemy.orm import Session
from .config import HOLIDAYS
import sys
import os

# Add parent directory to path to import models
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from models import Attendance

def is_holiday(d: date) -> int:
    return 1 if (d.month, d.day) in HOLIDAYS else 0

def is_weekend(d: date) -> int:
    return 1 if d.weekday() >= 5 else 0

def is_exam_season(d: date) -> int:
    # Typical Indian exam months: 12 (Dec), 1 (Jan), 3 (Mar), 4 (Apr), 5 (May)
    return 1 if d.month in [12, 1, 3, 4, 5] else 0

def is_pre_weekend(d: date) -> int:
    # Friday is often a transit day where students leave
    return 1 if d.weekday() == 4 else 0

def load_historical_attendance(db: Session, meal: str = "lunch", organization_code: str = None):
    """Load historical attendance data from the database."""
    query = db.query(Attendance).filter(Attendance.meal == meal)
    if organization_code:
        query = query.filter(Attendance.organization_code == organization_code)
    
    records = query.order_by(Attendance.date).all()
    
    if not records:
        return pd.DataFrame()
        
    data = {
        "date": [r.date for r in records],
        "attendance": [r.students for r in records]
    }
    return pd.DataFrame(data)

def clean_data(df: pd.DataFrame) -> pd.DataFrame:
    """Handle nulls and basic cleaning."""
    if df.empty:
        return df
        
    df = df.dropna()
    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values("date").reset_index(drop=True)
    return df
