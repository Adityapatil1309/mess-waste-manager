import sys
import os

# Add backend directory to sys.path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from database import SessionLocal
from ml.predict import calculate_smart_requirements
from datetime import date

db = SessionLocal()
try:
    print("Testing ML Prediction with fallback...")
    res = calculate_smart_requirements(db, students=350, organization_code=None)
    print("Calculation Complete:", res)
    
except Exception as e:
    import traceback
    traceback.print_exc()
finally:
    db.close()
