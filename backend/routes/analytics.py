from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from database import get_db
from models import Attendance, FoodCooked, Waste, Inventory, Prediction
from auth import get_current_user
from ml.predict import predict_attendance, calculate_smart_requirements
from datetime import date, timedelta
from utils.inventory_utils import normalize_name
from utils.item_registry import get_unified_items, STATIC_CORE_ITEMS

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


@router.get("/setup-status")
def get_setup_status(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    org_code = current_user.organization_code if current_user.role == "mess_manager" else None
    if not org_code:
        return {"has_data": False, "count": 0, "required": 30}
    
    count = db.query(Attendance).filter(Attendance.organization_code == org_code).count()
    return {
        "has_data": count >= 30,
        "count": count,
        "required": 30
    }

@router.post("/bulk-upload")
def bulk_upload_data(
    data: list[dict],
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    org_code = current_user.organization_code
    for entry in data:
        data_type = entry.get("type", "attendance")
        date_obj = date.fromisoformat(entry["date"])
        
        if data_type == "attendance":
            db.add(Attendance(
                date=date_obj,
                meal=entry.get("meal", "lunch"),
                students=entry["students"],
                organization_code=org_code,
                created_by=current_user.id
            ))
        elif data_type == "food":
            db.add(FoodCooked(
                date=date_obj,
                meal=entry.get("meal", "lunch"),
                rice_kg=entry.get("rice_kg", 0),
                dal_kg=entry.get("dal_kg", 0),
                vegetables_kg=entry.get("vegetables_kg", 0),
                organization_code=org_code,
                created_by=current_user.id
            ))
        elif data_type == "waste":
            db.add(Waste(
                date=date_obj,
                meal=entry.get("meal", "lunch"),
                waste_kg=entry.get("waste_kg", 0),
                notes=entry.get("notes", "Daily waste"),
                waste_type=entry.get("waste_type", "mixed"),
                organization_code=org_code,
                created_by=current_user.id
            ))
    db.commit()

    # Automatically pre-train the model after bulk upload
    from ml import train_model
    try:
        train_model(db, "lunch", org_code)
    except Exception as e:
        print(f"Initial training failed: {e}")

    return {"status": "success", "message": f"Uploaded {len(data)} records"}

def get_active_meal():
    """Determine which meal is currently active or upcoming."""
    from datetime import datetime
    now = datetime.now()
    hour = now.hour
    
    if 0 <= hour < 10: return "breakfast"
    if 10 <= hour < 15: return "lunch"
    return "dinner"

@router.get("/dashboard")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    today = date.today()
    org_code = current_user.organization_code if current_user.role == "mess_manager" else None
    active_meal = get_active_meal()

    # Today's attendance for the ACTIVE meal
    query_att = db.query(func.sum(Attendance.students)).filter(
        Attendance.date == today,
        Attendance.meal == active_meal
    )
    if org_code: query_att = query_att.filter(Attendance.organization_code == org_code)
    today_att = query_att.scalar() or 0

    # Live Prediction for Today's active meal
    from ml import predict_attendance
    
    query_pred = db.query(Prediction).filter(
        Prediction.date == today,
        Prediction.meal == active_meal
    )
    if org_code: query_pred = query_pred.filter(Prediction.organization_code == org_code)
    today_pred = query_pred.order_by(Prediction.id.desc()).first()
    
    confidence = 0.85
    status = "live"
    if not today_pred:
        try:
             res = predict_attendance(today, db, meal=active_meal, organization_code=org_code)
             predicted = res["predicted_students"]
             confidence = res.get("confidence", 0.85)
             status = res.get("status", "calculated")
        except Exception:
             predicted = 350
             status = "fallback"
    else:
        predicted = today_pred.predicted_students
        confidence = today_pred.confidence or 0.85

    # Today's waste (total for day)
    query_waste = db.query(func.sum(Waste.waste_kg)).filter(Waste.date == today)
    if org_code: query_waste = query_waste.filter(Waste.organization_code == org_code)
    today_waste = query_waste.scalar() or 0

    # Today's food cooked (total for day)
    core_kg_columns = [getattr(FoodCooked, key) for key, info in STATIC_CORE_ITEMS.items() if info["unit"] == "kg"]
    query_food = db.query(func.sum(sum(core_kg_columns))).filter(FoodCooked.date == today)
    if org_code: query_food = query_food.filter(FoodCooked.organization_code == org_code)
    today_food = query_food.scalar() or 0

    waste_pct = round((today_waste / today_food * 100), 1) if today_food > 0 else 0
    efficiency_pct = round((1 - today_waste / today_food) * 100, 1) if today_food > 0 else 100

    # Smart requirements for the PREDICTED students
    smart_req = calculate_smart_requirements(
        db, 
        predicted if predicted > 0 else 350, 
        organization_code=org_code
    )

    # Inventory alerts count
    low_stock_q = db.query(Inventory).filter(Inventory.quantity_kg <= Inventory.min_threshold)
    if org_code: low_stock_q = low_stock_q.filter(Inventory.organization_code == org_code)
    low_stock = low_stock_q.count()

    return {
        "today_attendance": today_att,
        "predicted_attendance": predicted,
        "active_meal": active_meal,
        "prediction_confidence": confidence,
        "prediction_status": status,
        "waste_percentage": waste_pct,
        "efficiency_pct": efficiency_pct,
        "today_waste_kg": round(today_waste, 2),
        "today_food_kg": round(today_food, 2),
        "food_required_kg": smart_req["total_food_kg"],
        "food_requirements": smart_req,
        "insight": smart_req["insight"],
        "low_stock_alerts": low_stock,
        "date": today.isoformat()
    }


@router.get("/attendance-trend")
def attendance_trend(
    days: int = 30,
    meal: str = "lunch",
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    start = date.today() - timedelta(days=days)
    query = db.query(Attendance).filter(Attendance.date >= start).filter(Attendance.meal == meal)
    if current_user.role == "mess_manager" and current_user.organization_code:
        query = query.filter(Attendance.organization_code == current_user.organization_code)
    
    records = query.order_by(Attendance.date).all()
    return [
        {"date": r.date.isoformat(), "students": r.students, "meal": r.meal}
        for r in records
    ]


@router.get("/waste-trend")
def waste_trend(
    days: int = 30,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    start = date.today() - timedelta(days=days)
    query = db.query(Waste).filter(Waste.date >= start)
    if current_user.role == "mess_manager" and current_user.organization_code:
        query = query.filter(Waste.organization_code == current_user.organization_code)
    
    records = query.order_by(Waste.date).all()

    daily = {}
    for r in records:
        d = r.date.isoformat()
        daily[d] = daily.get(d, 0) + r.waste_kg

    return [{"date": k, "waste_kg": round(v, 2)} for k, v in sorted(daily.items())]


@router.get("/food-vs-waste")
def food_vs_waste(
    days: int = 30,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    start = date.today() - timedelta(days=days)
    org_code = current_user.organization_code if current_user.role == "mess_manager" else None

    food_query = db.query(FoodCooked).filter(FoodCooked.date >= start)
    waste_query = db.query(Waste).filter(Waste.date >= start)
    if org_code:
        food_query = food_query.filter(FoodCooked.organization_code == org_code)
        waste_query = waste_query.filter(Waste.organization_code == org_code)

    food_records = food_query.all()
    waste_records = waste_query.all()

    daily_food = {}
    for r in food_records:
        d = r.date.isoformat()
        # Sum all core items defined in registry for this record
        total_kg = sum([getattr(r, key) for key, info in STATIC_CORE_ITEMS.items() if info["unit"] == "kg"])
        daily_food[d] = daily_food.get(d, 0) + total_kg

    daily_waste = {}
    for r in waste_records:
        d = r.date.isoformat()
        daily_waste[d] = daily_waste.get(d, 0) + r.waste_kg

    all_dates = sorted(set(list(daily_food.keys()) + list(daily_waste.keys())))
    return [
        {
            "date": d,
            "food_kg": round(daily_food.get(d, 0), 2),
            "waste_kg": round(daily_waste.get(d, 0), 2),
            "efficiency": round(
                (1 - daily_waste.get(d, 0) / daily_food.get(d, 1)) * 100, 1
            ) if daily_food.get(d, 0) > 0 else 100
        }
        for d in all_dates
    ]


@router.get("/monthly-summary")
def monthly_summary(
    year: int = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    if year is None:
        year = date.today().year
    org_code = current_user.organization_code if current_user.role == "mess_manager" else None

    months = []
    for m in range(1, 13):
        att_q = db.query(func.avg(Attendance.students)).filter(
            extract("year", Attendance.date) == year,
            extract("month", Attendance.date) == m
        )
        waste_q = db.query(func.sum(Waste.waste_kg)).filter(
            extract("year", Waste.date) == year,
            extract("month", Waste.date) == m
        )
        core_kg_columns = [getattr(FoodCooked, key) for key, info in STATIC_CORE_ITEMS.items() if info["unit"] == "kg"]
        food_q = db.query(func.sum(sum(core_kg_columns))).filter(
            extract("year", FoodCooked.date) == year,
            extract("month", FoodCooked.date) == m
        )
        if org_code:
            att_q = att_q.filter(Attendance.organization_code == org_code)
            waste_q = waste_q.filter(Waste.organization_code == org_code)
            food_q = food_q.filter(FoodCooked.organization_code == org_code)

        att = att_q.scalar() or 0
        waste = waste_q.scalar() or 0
        food = food_q.scalar() or 0

        months.append({
            "month": m,
            "avg_attendance": round(float(att), 0),
            "total_waste_kg": round(float(waste), 2),
            "total_food_kg": round(float(food), 2),
            "waste_percentage": round(float(waste) / float(food) * 100, 1) if food > 0 else 0
        })

    return {"year": year, "months": months}


@router.get("/procurement-suggestions")
def procurement_suggestions(
    days: int = 7,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    today = date.today()
    total_predicted = 0
    org_code = current_user.organization_code if current_user.role == "mess_manager" else None
    
    # 1. Calculate total predicted students for the period
    for i in range(1, days + 1):
        try:
            result = predict_attendance(today + timedelta(days=i), db, organization_code=org_code)
            total_predicted += result["predicted_students"]
        except Exception:
            total_predicted += 350 # Fallback average

    # 2. Get requirements for ALL items based on total students
    smart_req = calculate_smart_requirements(db, total_predicted, organization_code=org_code)
    avg_daily_students = round(total_predicted / days) if days > 0 else 350

    # 3. Get Unified Inventory (Merged with core items)
    unified_items = get_unified_items(db, org_code)

    suggestions = []
    insights = []
    urgent_count = 0

    # 4. Generate suggestions for each unified item
    for rec in smart_req["all_recommendations"]:
        item_name = rec["name"]
        norm_name = normalize_name(item_name)
        required = rec["recommended_qty"]
        current_stock = rec["current_stock"]
        unit = rec["unit"]
        
        to_procure = max(0, required - current_stock)
        
        # Get factor from registry for daily consumption
        item_info = unified_items.get(norm_name, {})
        factor = item_info.get("factor", 0.05)
        
        daily_consumption = round(avg_daily_students * factor, 2)
        days_left = round(current_stock / daily_consumption, 1) if daily_consumption > 0 else 999
        buy_by_date = (today + timedelta(days=int(days_left))).isoformat() if days_left < 999 else None

        # Action Logic
        action = "NO ACTION"
        priority = "ok"
        
        if to_procure > 0:
            if days_left <= 3:
                action = "BUY NOW"
                priority = "high"
                urgent_count += 1
            else:
                action = "PLAN PURCHASE"
                priority = "medium"
        
        suggestions.append({
            "item": item_name,
            "current_stock_kg": round(current_stock, 2),
            "required_kg": round(required, 2),
            "to_procure_kg": round(to_procure, 2),
            "unit": unit,
            "priority": priority,
            "action": action,
            "daily_consumption": daily_consumption,
            "days_left": round(days_left, 1) if days_left < 999 else None,
            "buy_by_date": buy_by_date,
            "is_core": rec["is_core"]
        })

    # Generate smart insights
    insights.append(smart_req["insight"])
    
    items_needing_purchase = sum(1 for s in suggestions if s["to_procure_kg"] > 0)
    if items_needing_purchase > 0:
        insights.append(f"{items_needing_purchase} of {len(suggestions)} items need restocking for the next {days} days.")

    return {
        "period": days,
        "total_predicted_students": total_predicted,
        "avg_daily_students": avg_daily_students,
        "urgent_count": urgent_count,
        "suggestions": sorted(suggestions, key=lambda x: (x['priority'] == 'high'), reverse=True),
        "insights": insights,
        "optimization": smart_req.get("optimization_applied", 0),
    }
