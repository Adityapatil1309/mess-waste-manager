from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from database import get_db
from auth import get_current_user
from ml import predict_attendance, train_model
from schemas import FuturePredictionRequest
from datetime import date, timedelta

router = APIRouter(prefix="/api/ml", tags=["Machine Learning"])

@router.post("/predict")
def ml_predict(
    data: FuturePredictionRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """
    Generate predictions and return them with daily, weekly, and monthly aggregations.
    Fallback logic is handled gracefully by predict_attendance.
    """
    today = date.today()
    org_code = current_user.organization_code if current_user.role == "mess_manager" else None
    
    daily = []
    
    # We predict starting from tomorrow
    for i in range(1, data.days + 1):
        target = today + timedelta(days=i)
        try:
            result = predict_attendance(target, db, data.meal, organization_code=org_code)
            daily.append(result)
        except Exception as e:
            daily.append({
                "date": target.isoformat(),
                "meal": data.meal,
                "predicted_students": 350,  # Fallback
                "error": str(e)
            })

    # Calculate weekly aggregation (group by week)
    weekly = []
    for i in range(0, len(daily), 7):
        week_chunk = daily[i:i+7]
        if week_chunk:
            total_students = sum(d.get("predicted_students", 0) for d in week_chunk)
            weekly.append({
                "start_date": week_chunk[0]["date"],
                "end_date": week_chunk[-1]["date"],
                "total_predicted": total_students,
                "avg_predicted": total_students // len(week_chunk)
            })

    # Calculate monthly aggregation
    monthly_total = sum(d.get("predicted_students", 0) for d in daily)

    return {
        "daily": daily,
        "weekly": weekly,
        "monthly": monthly_total,
        "days_requested": data.days,
        "meal": data.meal
    }


@router.post("/train")
def ml_train(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """
    Triggers background retraining of the XGBoost model.
    """
    org_code = current_user.organization_code if current_user.role == "mess_manager" else None
    
    def background_training():
        # A new db session might be needed, but we can try with the current one 
        # or create a new session if required by background tasks.
        # For safety in SQLAlchemy background tasks, it's better to use a new session.
        from database import SessionLocal
        bg_db = SessionLocal()
        try:
            train_model(bg_db, organization_code=org_code)
        except Exception as e:
            print(f"Background training failed: {e}")
        finally:
            bg_db.close()

    background_tasks.add_task(background_training)
    
    return {"message": "Model retraining started in the background."}
