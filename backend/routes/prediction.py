from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from auth import get_current_user
from ml import predict_attendance, train_model, calculate_food_requirements
from ml.config import METRICS_PATH
import json
import os

from schemas import PredictionRequest, FuturePredictionRequest
from models import Prediction
from typing import List
from datetime import date, timedelta

router = APIRouter(prefix="/api/prediction", tags=["Prediction"])


@router.post("/predict")
def predict(
    data: PredictionRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    org_code = current_user.organization_code if current_user.role == "mess_manager" else None
    result = predict_attendance(data.date, db, data.meal, organization_code=org_code)
    return result


@router.post("/predict-future")
def predict_future(
    data: FuturePredictionRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    today = date.today()
    org_code = current_user.organization_code if current_user.role == "mess_manager" else None
    predictions = []
    
    # We predict starting from tomorrow
    for i in range(1, data.days + 1):
        target = today + timedelta(days=i)
        try:
            result = predict_attendance(target, db, data.meal, organization_code=org_code)
            predictions.append(result)
        except Exception as e:
            predictions.append({
                "date": target.isoformat(),
                "meal": data.meal,
                "predicted_students": 350,  # Fallback
                "error": str(e)
            })
    return {"predictions": predictions, "days": data.days, "meal": data.meal}


@router.post("/predict-week")
def predict_week(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    # Keep for backward compatibility
    return predict_future(FuturePredictionRequest(days=7, meal="lunch"), db, current_user)


@router.post("/train")
def retrain_model(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    org_code = current_user.organization_code if current_user.role == "mess_manager" else None
    metrics = train_model(db, organization_code=org_code)
    return {"message": "Model retrained successfully", "metrics": metrics}


@router.get("/metrics")
def model_metrics(current_user=Depends(get_current_user)):
    if os.path.exists(METRICS_PATH):
        with open(METRICS_PATH, "r") as f:
            return json.load(f)
    return {"status": "Model not trained yet"}


@router.get("/food-requirements/{students}")
def get_food_requirements(
    students: int,
    current_user=Depends(get_current_user)
):
    return calculate_food_requirements(students)


@router.get("/history")
def prediction_history(
    limit: int = 30,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    org_code = current_user.organization_code if current_user.role == "mess_manager" else None
    query = db.query(Prediction)
    if org_code:
        query = query.filter(Prediction.organization_code == org_code)
    records = (
        query
        .order_by(Prediction.date.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": r.id,
            "date": r.date.isoformat(),
            "meal": r.meal,
            "predicted_students": r.predicted_students,
            "actual_students": r.actual_students,
            "confidence": r.confidence,
            "model_version": r.model_version
        }
        for r in records
    ]
