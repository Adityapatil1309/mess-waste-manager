from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import FoodCooked, Prediction
from schemas import FoodCookedCreate, FoodCookedResponse
from auth import get_current_user
from typing import List, Optional
from datetime import date
from ml.predict import predict_attendance

router = APIRouter(prefix="/api/food", tags=["Food Cooking"])


@router.post("/", response_model=FoodCookedResponse)
def create_food_entry(
    data: FoodCookedCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    if current_user.role not in ("admin", "mess_manager"):
        raise HTTPException(status_code=403, detail="Manager access required")
    
    # 1. Get Prediction for metrics calculation (if exists)
    pred = db.query(Prediction).filter(
        Prediction.date == data.date,
        Prediction.meal == data.meal,
        Prediction.organization_code == current_user.organization_code
    ).order_by(Prediction.created_at.desc()).first()

    metrics = {
        "efficiency": 100.0,
        "overcook_pct": 0.0,
        "insight": "Data saved successfully.",
        "prediction_id": pred.id if pred else None
    }

    if pred:
        # Calculate efficiency based on core item (Rice)
        recommended_rice = 0
        actual_rice = data.rice_kg
        
        # We need to re-calculate or retrieve the recommended rice from the prediction
        # To avoid re-running complex ML, we just check if it was saved in prediction (not currently)
        # But predict_attendance returns it.
        try:
            full_pred = predict_attendance(data.date, db, data.meal, current_user.organization_code)
            recommended_rice = full_pred["food_requirements"].get("rice_kg", 0)
            
            if recommended_rice > 0:
                diff = actual_rice - recommended_rice
                metrics["overcook_pct"] = round((diff / recommended_rice) * 100, 1)
                # Efficiency is 100 minus the absolute deviation percentage
                dev_pct = abs(diff / recommended_rice)
                metrics["efficiency"] = round(max(0, 100 * (1 - dev_pct)), 1)
                
                if metrics["overcook_pct"] > 15:
                    metrics["insight"] = f"Warning: Cooked {metrics['overcook_pct']}% more rice than recommended."
                elif metrics["overcook_pct"] < -15:
                    metrics["insight"] = f"Caution: Cooked {abs(metrics['overcook_pct'])}% less rice than recommended."
                else:
                    metrics["insight"] = "Perfect alignment with AI recommendations!"
        except Exception as e:
            print(f"Error calculating metrics: {e}")

    # 2. Map fields to FoodCooked model
    record = FoodCooked(
        date=data.date,
        meal=data.meal,
        rice_kg=data.rice_kg,
        wheat_kg=data.wheat_kg,
        dal_kg=data.dal_kg,
        vegetables_kg=data.vegetables_kg,
        milk_liters=data.milk_liters,
        eggs_units=data.eggs_units,
        poha_kg=data.poha_kg,
        curd_kg=data.curd_kg,
        oil_liters=data.oil_liters,
        chapati_count=data.chapati_count,
        other_items=data.other_items,
        items=data.items,
        metrics=metrics, # Save the calculated metrics
        organization_code=current_user.organization_code,
        created_by=current_user.id
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.get("/", response_model=List[FoodCookedResponse])
def get_food_entries(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    meal: Optional[str] = None,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    query = db.query(FoodCooked)
    if current_user.role == "mess_manager" and current_user.organization_code:
        query = query.filter(FoodCooked.organization_code == current_user.organization_code)
    
    if start_date:
        query = query.filter(FoodCooked.date >= start_date)
    if end_date:
        query = query.filter(FoodCooked.date <= end_date)
    if meal:
        query = query.filter(FoodCooked.meal == meal)
    return query.order_by(FoodCooked.date.desc()).limit(limit).all()


@router.get("/today")
def get_today_food(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    today = date.today()
    query = db.query(FoodCooked).filter(FoodCooked.date == today)
    if current_user.role == "mess_manager" and current_user.organization_code:
        query = query.filter(FoodCooked.organization_code == current_user.organization_code)
    
    records = query.all()
    
    # Calculate dynamic totals from items dict
    totals = {}
    for r in records:
        items_dict = r.items or {}
        for item, qty in items_dict.items():
            if qty:
                totals[item] = totals.get(item, 0) + qty

    return {
        "date": today.isoformat(),
        "totals": totals,
        "entries": [
            {
                "meal": r.meal,
                "items": r.items or {
                    "rice_kg": r.rice_kg,
                    "dal_kg": r.dal_kg,
                    "vegetables_kg": r.vegetables_kg,
                    "chapati_count": r.chapati_count
                }
            }
            for r in records
        ]
    }


@router.delete("/{record_id}")
def delete_food_entry(
    record_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    record = db.query(FoodCooked).filter(FoodCooked.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    if current_user.role == "mess_manager" and record.organization_code != current_user.organization_code:
        raise HTTPException(status_code=403, detail="Not authorized to delete this record")
    db.delete(record)
    db.commit()
    return {"message": "Record deleted successfully"}
