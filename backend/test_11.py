import os, sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from database import SessionLocal
from models import User, StudentAttendance
from datetime import date

db = SessionLocal()
try:
    current_user = db.query(User).filter(User.id == 11).first() # PRUTHVIRAJ CHAVAN mess_manager 1ab2
    d = date.today()
    
    query = db.query(StudentAttendance).join(User, StudentAttendance.student_id == User.id).filter(
        StudentAttendance.date == d
    )
    student_query = db.query(User).filter(User.role == "student")
    
    if current_user.role == "mess_manager" and current_user.organization_code:
        query = query.filter(User.organization_code == current_user.organization_code)
        student_query = student_query.filter(User.organization_code == current_user.organization_code)

    records = query.all()
    total_students = student_query.count()

    print(f"DEBUG: date={d}")
    print(f"DEBUG: total_students={total_students}")
    print(f"DEBUG: total records={len(records)}")

except Exception as e:
    import traceback
    traceback.print_exc()

db.close()
