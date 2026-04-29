from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Waste
from schemas import WasteCreate, WasteResponse
from auth import get_current_user
from typing import List, Optional
from datetime import date

router = APIRouter(prefix="/api/waste", tags=["Waste"])


@router.post("/", response_model=WasteResponse)
def create_waste_entry(
    data: WasteCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    if current_user.role not in ("admin", "mess_manager"):
        raise HTTPException(status_code=403, detail="Manager access required")
    record = Waste(
        date=data.date,
        meal=data.meal,
        waste_kg=data.waste_kg,
        waste_type=data.waste_type,
        notes=data.notes,
        organization_code=current_user.organization_code,
        created_by=current_user.id
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.get("/", response_model=List[WasteResponse])
def get_waste_entries(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    meal: Optional[str] = None,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    query = db.query(Waste)
    if current_user.role == "mess_manager" and current_user.organization_code:
        query = query.filter(Waste.organization_code == current_user.organization_code)
    
    if start_date:
        query = query.filter(Waste.date >= start_date)
    if end_date:
        query = query.filter(Waste.date <= end_date)
    if meal:
        query = query.filter(Waste.meal == meal)
    return query.order_by(Waste.date.desc()).limit(limit).all()


@router.get("/summary")
def get_waste_summary(
    days: int = 30,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    from datetime import timedelta
    start = date.today() - timedelta(days=days)
    query = db.query(Waste).filter(Waste.date >= start)
    if current_user.role == "mess_manager" and current_user.organization_code:
        query = query.filter(Waste.organization_code == current_user.organization_code)
    
    records = query.all()

    total_waste = sum(r.waste_kg for r in records)
    by_type = {}
    by_meal = {}
    daily = {}

    for r in records:
        by_type[r.waste_type] = by_type.get(r.waste_type, 0) + r.waste_kg
        by_meal[r.meal] = by_meal.get(r.meal, 0) + r.waste_kg
        d = r.date.isoformat()
        daily[d] = daily.get(d, 0) + r.waste_kg

    return {
        "period_days": days,
        "total_waste_kg": round(total_waste, 2),
        "avg_daily_waste_kg": round(total_waste / max(days, 1), 2),
        "by_type": by_type,
        "by_meal": by_meal,
        "daily_trend": [{"date": k, "waste_kg": round(v, 2)} for k, v in sorted(daily.items())]
    }


@router.delete("/{record_id}")
def delete_waste_entry(
    record_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    record = db.query(Waste).filter(Waste.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    if current_user.role == "mess_manager" and record.organization_code != current_user.organization_code:
        raise HTTPException(status_code=403, detail="Not authorized to delete this record")
    db.delete(record)
    db.commit()
    return {"message": "Record deleted successfully"}
