import os
import joblib
import numpy as np
import pandas as pd
from datetime import date, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
import sys

from .config import MODEL_PATH
from .preprocess import is_weekend, is_holiday, is_exam_season, is_pre_weekend

# Add parent directory to path to import models
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from models import Attendance, Prediction, StudentAttendance, User, Waste, FoodCooked
from utils.item_registry import get_unified_items, STATIC_CORE_ITEMS

# Singleton Model Loader
_model_cache = None

def get_model():
    global _model_cache
    if _model_cache is None:
        if os.path.exists(MODEL_PATH):
            _model_cache = joblib.load(MODEL_PATH)
    return _model_cache

def calculate_smart_requirements(db: Session, students: int, organization_code: str = None) -> dict:
    today = date.today()
    
    # 1. Get Unified Registry (Core + Inventory)
    unified_items = get_unified_items(db, organization_code)
    
    # 2. Feedback loop: Adjust based on last 7 days of waste
    reduction_factor = 1.0 # default
    insight = "Operating at standard efficiency levels."
    
    history = db.query(Waste).filter(
        Waste.date >= today - timedelta(days=7),
        Waste.organization_code == organization_code
    ).all()

    if history:
        total_waste = sum([w.waste_kg for w in history])
        # Track main core items for simple efficiency calc
        total_food = db.query(func.sum(
            FoodCooked.rice_kg + FoodCooked.dal_kg + FoodCooked.vegetables_kg
        )).filter(
            FoodCooked.date >= today - timedelta(days=7),
            FoodCooked.organization_code == organization_code
        ).scalar() or 0
        
        waste_ratio = (total_waste / total_food) if total_food > 0 else 0
        
        if waste_ratio > 0.12:
             reduction_factor = 0.90
             insight = f"High waste detected ({round(waste_ratio*100)}%). AI optimized production to -10%."
        elif waste_ratio > 0.07:
             reduction_factor = 0.95
             insight = f"Moderate waste detected ({round(waste_ratio*100)}%). Optimized production to -5%."
        elif waste_ratio < 0.03 and total_food > 50:
             reduction_factor = 1.05
             insight = "Excellent efficiency! Increased buffer by 5% to prevent shortage."

    # 3. Calculate requirements for ALL items
    results = {
        "insight": insight,
        "optimization_applied": round((1 - reduction_factor) * 100, 1) if reduction_factor != 1.0 else 0,
        "factor_used": reduction_factor,
        "all_recommendations": []
    }
    
    from utils.inventory_utils import normalize_name
    
    # Keep flat core items for UI backward compatibility
    for key, info in STATIC_CORE_ITEMS.items():
        norm = normalize_name(info["name"])
        # Use learned factor from unified registry (which includes historical intelligence)
        factor = unified_items.get(norm, {}).get("factor", info["factor"])
        
        val = round(students * factor * reduction_factor, 2 if "spices" in key else 1)
        # Round units to integer
        if "units" in key or "count" in key:
            val = int(round(students * factor * reduction_factor, 0))
        results[key] = val

    # Fill all_recommendations list for new logic/procurement
    for norm_name, item in unified_items.items():
        rec_qty = round(students * item["factor"] * reduction_factor, 2)
        results["all_recommendations"].append({
            "name": item["name"],
            "unit": item["unit"],
            "recommended_qty": rec_qty,
            "is_core": item["is_core"],
            "current_stock": item.get("current_stock", 0)
        })

    # Backward compatibility for total_food_kg
    # Sum of factors for items that use kg
    total_kg_factor = sum([
        unified_items.get(normalize_name(info["name"]), {}).get("factor", info["factor"])
        for info in STATIC_CORE_ITEMS.values() if info["unit"] == "kg"
    ])
    results["total_food_kg"] = round(students * total_kg_factor * reduction_factor, 1)

    return results

def calculate_food_requirements(students: int) -> dict:
    """Legacy wrapper for simple requirements if DB session is not available."""
    return {
        "rice_kg": round(students * 0.18, 1),
        "wheat_kg": round(students * 0.22, 1),
        "dal_kg": round(students * 0.08, 1),
        "vegetables_kg": round(students * 0.15, 1),
        "milk_liters": round(students * 0.15, 1),
        "eggs_units": round(students * 1.2, 0),
        "poha_kg": round(students * 0.06, 1),
        "curd_kg": round(students * 0.05, 1),
        "chapati_count": students * 3,
        "oil_liters": round(students * 0.02, 1),
        "spices_kg": round(students * 0.005, 2),
        "total_food_kg": round(students * (0.18 + 0.22 + 0.08 + 0.15), 1)
    }

def _get_fallback_prediction(target_date: date, db: Session, meal: str, organization_code: str) -> int:
    """Fallback logic if ML model fails or is not trained."""
    query = db.query(Attendance).filter(Attendance.meal == meal)
    if organization_code:
        query = query.filter(Attendance.organization_code == organization_code)
        
    recent = query.order_by(Attendance.date.desc()).limit(1).first()
    return recent.students if recent else 350

def predict_attendance(target_date: date, db: Session, meal: str = "lunch", organization_code: str = None) -> dict:
    """Predict attendance for a given date with fallbacks."""
    model = get_model()
    
    # 1. Base Prediction
    if model is None:
        base_prediction = _get_fallback_prediction(target_date, db, meal, organization_code)
        confidence = 0.50 # Low confidence due to fallback
        model_version = "fallback"
    else:
        try:
            # Get recent attendance for feature calculation
            query_recent = db.query(Attendance).filter(Attendance.meal == meal)
            if organization_code:
                query_recent = query_recent.filter(Attendance.organization_code == organization_code)
            
            recent = query_recent.order_by(Attendance.date.desc()).limit(10).all()

            if recent:
                prev_att = recent[0].students
                rolling_3 = np.mean([r.students for r in recent[:3]])
                rolling_7 = np.mean([r.students for r in recent[:7]])
                lag_2 = recent[1].students if len(recent) > 1 else prev_att
                lag_7 = recent[6].students if len(recent) > 6 else prev_att
            else:
                # Default fallback values for features if no recent data
                prev_att = 350
                rolling_3 = 350
                rolling_7 = 350
                lag_2 = 350
                lag_7 = 350

            features = pd.DataFrame([{
                "day_of_week": target_date.weekday(),
                "month": target_date.month,
                "day_of_month": target_date.day,
                "weekend": is_weekend(target_date),
                "holiday": is_holiday(target_date),
                "exam_season": is_exam_season(target_date),
                "pre_weekend": is_pre_weekend(target_date),
                "prev_attendance": prev_att,
                "rolling_avg_3": rolling_3,
                "rolling_avg_7": rolling_7,
                "attendance_lag_2": lag_2,
                "attendance_lag_7": lag_7
            }])

            base_prediction = int(max(50, model.predict(features)[0]))
            confidence = 0.85
            model_version = "v2_xgboost"
        except Exception as e:
            print(f"ML Prediction failed: {e}. Using fallback.")
            base_prediction = _get_fallback_prediction(target_date, db, meal, organization_code)
            confidence = 0.50
            model_version = "fallback_error"

    # 2. Incorporate real student RSVP data (Blending)
    rsvp_query = db.query(StudentAttendance).join(User, StudentAttendance.student_id == User.id).filter(
        and_(
            StudentAttendance.date == target_date,
            StudentAttendance.meal == meal
        )
    )
    if organization_code:
        rsvp_query = rsvp_query.filter(User.organization_code == organization_code)
    
    rsvps = rsvp_query.all()
    
    coming_count = sum(1 for r in rsvps if r.status == "coming")
    not_coming_count = sum(1 for r in rsvps if r.status == "not_coming")
    
    user_query = db.query(User).filter(User.role == "student")
    if organization_code:
        user_query = user_query.filter(User.organization_code == organization_code)
    total_students = user_query.count()
    total_rsvps = coming_count + not_coming_count

    # The firm lower bound should be the number of people who actively said "coming".
    prediction = max(base_prediction, coming_count)

    # If a high percentage of students have voted, blend.
    if total_rsvps > 0 and total_students > 0:
        response_rate = total_rsvps / total_students
        if response_rate > 0.5:
            unmarked = total_students - total_rsvps
            max_possible = coming_count + unmarked
            prediction = min(prediction, max_possible)

    prediction = int(prediction)

    # 3. Calculate food requirements based on prediction
    try:
        food_req = calculate_smart_requirements(db, prediction, organization_code)
    except Exception as e:
        print(f"Smart requirements calculation failed: {e}. Using legacy.")
        food_req = calculate_food_requirements(prediction)
        food_req["insight"] = "Using legacy calculation mode."

    # 4. Save prediction to DB (Only if future date or today)
    if target_date >= date.today():
        pred_record = Prediction(
            date=target_date,
            meal=meal,
            predicted_students=prediction,
            model_version=model_version,
            confidence=confidence,
            organization_code=organization_code
        )
        db.add(pred_record)
        try:
            db.commit()
            db.refresh(pred_record)
            pred_id = pred_record.id
        except Exception as e:
            db.rollback()
            pred_id = None
            print(f"Failed to save prediction to DB: {e}")
    else:
        pred_id = None

    return {
        "date": target_date.isoformat(),
        "meal": meal,
        "predicted_students": prediction,
        "confidence": confidence,
        "food_requirements": food_req,
        "id": pred_id
    }
