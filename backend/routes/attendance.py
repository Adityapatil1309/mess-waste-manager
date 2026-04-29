from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import Attendance
from schemas import AttendanceCreate, AttendanceResponse
from auth import get_current_user
from typing import List, Optional
from datetime import date

router = APIRouter(prefix="/api/attendance", tags=["Attendance"])


from ml import train_model


@router.post("/", response_model=AttendanceResponse)
def create_attendance(
    data: AttendanceCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    if current_user.role not in ("admin", "mess_manager"):
        raise HTTPException(status_code=403, detail="Manager access required")
    record = Attendance(
        date=data.date,
        meal=data.meal,
        students=data.students,
        organization_code=current_user.organization_code,
        created_by=current_user.id
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    # Automatically re-train model with new data
    try:
        train_model(db, record.meal, current_user.organization_code)
    except Exception as e:
        print(f"Auto-train failed: {e}")

    return record


@router.get("/", response_model=List[AttendanceResponse])
def get_attendance(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    meal: Optional[str] = None,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    query = db.query(Attendance)
    if current_user.role == "mess_manager" and current_user.organization_code:
        query = query.filter(Attendance.organization_code == current_user.organization_code)
    
    if start_date:
        query = query.filter(Attendance.date >= start_date)
    if end_date:
        query = query.filter(Attendance.date <= end_date)
    if meal:
        query = query.filter(Attendance.meal == meal)
    return query.order_by(Attendance.date.desc()).limit(limit).all()


@router.get("/today")
def get_today_attendance(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    today = date.today()
    query = db.query(Attendance).filter(Attendance.date == today)
    if current_user.role == "mess_manager" and current_user.organization_code:
        query = query.filter(Attendance.organization_code == current_user.organization_code)
    
    records = query.all()
    total = sum(r.students for r in records)
    return {
        "date": today.isoformat(),
        "total_students": total,
        "meals": [{"meal": r.meal, "students": r.students} for r in records]
    }


@router.put("/{record_id}", response_model=AttendanceResponse)
def update_attendance(
    record_id: int,
    data: AttendanceCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    record = db.query(Attendance).filter(Attendance.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    if current_user.role == "mess_manager" and record.organization_code != current_user.organization_code:
        raise HTTPException(status_code=403, detail="Not authorized to modify this record")
    record.date = data.date
    record.meal = data.meal
    record.students = data.students
    db.commit()
    db.refresh(record)

    # Re-train model with updated data
    try:
        train_model(db, record.meal, current_user.organization_code)
    except Exception as e:
        print(f"Update-train failed: {e}")

    return record


@router.delete("/{record_id}")
def delete_attendance(
    record_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    record = db.query(Attendance).filter(Attendance.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    if current_user.role == "mess_manager" and record.organization_code != current_user.organization_code:
        raise HTTPException(status_code=403, detail="Not authorized to delete this record")
    db.delete(record)
    db.commit()
    return {"message": "Record deleted successfully"}
