import json
from datetime import date
from database import SessionLocal
from ml import predict_attendance

db = SessionLocal()
try:
    res = predict_attendance(date.today(), db, "lunch")
    print(json.dumps(res, indent=2))
except Exception as e:
    import traceback
    traceback.print_exc()
finally:
    db.close()
