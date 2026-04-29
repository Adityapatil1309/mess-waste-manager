from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import FoodFeedback
from schemas import FoodFeedbackCreate, FoodFeedbackResponse, FoodFeedbackSummary, FoodFeedbackStats
from auth import get_current_user
from typing import List, Optional
from datetime import date, timedelta
from collections import defaultdict

router = APIRouter(prefix="/api/food-feedback", tags=["Food Feedback"])


@router.post("/", response_model=FoodFeedbackResponse)
def create_feedback(
    data: FoodFeedbackCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Students can submit food feedback with rating and optional comment."""
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can submit feedback")
    
    record = FoodFeedback(
        student_id=current_user.id,
        date=data.date,
        meal=data.meal,
        food_item=data.food_item,
        rating=data.rating,
        comment=data.comment,
        organization_code=current_user.organization_code
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.get("/", response_model=List[FoodFeedbackResponse])
def get_feedback(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    meal: Optional[str] = None,
    food_item: Optional[str] = None,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Get feedback entries. Students see their own, managers see all org feedback."""
    query = db.query(FoodFeedback)
    
    # Role-based filtering
    if current_user.role == "student":
        query = query.filter(FoodFeedback.student_id == current_user.id)
    elif current_user.role == "mess_manager" and current_user.organization_code:
        query = query.filter(FoodFeedback.organization_code == current_user.organization_code)
    
    # Optional filters
    if start_date:
        query = query.filter(FoodFeedback.date >= start_date)
    if end_date:
        query = query.filter(FoodFeedback.date <= end_date)
    if meal:
        query = query.filter(FoodFeedback.meal == meal)
    if food_item:
        query = query.filter(FoodFeedback.food_item.ilike(f"%{food_item}%"))
    
    return query.order_by(FoodFeedback.created_at.desc()).limit(limit).all()


@router.get("/summary", response_model=List[FoodFeedbackSummary])
def get_feedback_summary(
    days: int = 30,
    meal: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Get average ratings per food item - for managers/admins."""
    if current_user.role not in ("admin", "mess_manager"):
        raise HTTPException(status_code=403, detail="Manager access required")
    
    from datetime import timedelta
    start_date = date.today() - timedelta(days=days)
    
    query = db.query(FoodFeedback).filter(FoodFeedback.date >= start_date)
    if current_user.organization_code:
        query = query.filter(FoodFeedback.organization_code == current_user.organization_code)
    if meal:
        query = query.filter(FoodFeedback.meal == meal)
    
    feedback_list = query.all()
    
    # Aggregate by food_item
    item_data = defaultdict(lambda: {"ratings": [], "breakdown": {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}})
    
    for fb in feedback_list:
        item_data[fb.food_item]["ratings"].append(fb.rating)
        item_data[fb.food_item]["breakdown"][fb.rating] += 1
    
    summaries = []
    for food_item, data in item_data.items():
        avg = sum(data["ratings"]) / len(data["ratings"]) if data["ratings"] else 0
        summaries.append(FoodFeedbackSummary(
            food_item=food_item,
            avg_rating=round(avg, 2),
            total_feedback=len(data["ratings"]),
            rating_breakdown=data["breakdown"]
        ))
    
    # Sort by average rating descending
    summaries.sort(key=lambda x: x.avg_rating, reverse=True)
    return summaries


@router.get("/stats", response_model=FoodFeedbackStats)
def get_feedback_stats(
    days: int = 30,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Get overall feedback statistics - for managers/admins."""
    if current_user.role not in ("admin", "mess_manager"):
        raise HTTPException(status_code=403, detail="Manager access required")
    
    from datetime import timedelta
    start_date = date.today() - timedelta(days=days)
    
    query = db.query(FoodFeedback).filter(FoodFeedback.date >= start_date)
    if current_user.organization_code:
        query = query.filter(FoodFeedback.organization_code == current_user.organization_code)
    
    feedback_list = query.all()
    
    if not feedback_list:
        return FoodFeedbackStats(
            total_feedback=0,
            average_rating=0,
            by_meal={},
            by_date=[]
        )
    
    # Calculate stats
    total = len(feedback_list)
    avg_rating = sum(fb.rating for fb in feedback_list) / total
    
    # By meal
    meal_ratings = defaultdict(list)
    for fb in feedback_list:
        meal_ratings[fb.meal].append(fb.rating)
    by_meal = {meal: sum(ratings)/len(ratings) for meal, ratings in meal_ratings.items()}
    
    # By date
    date_ratings = defaultdict(list)
    for fb in feedback_list:
        date_ratings[fb.date.isoformat()].append(fb.rating)
    by_date = [
        {"date": d, "avg_rating": round(sum(ratings)/len(ratings), 2), "count": len(ratings)}
        for d, ratings in sorted(date_ratings.items(), reverse=True)
    ]
    
    return FoodFeedbackStats(
        total_feedback=total,
        average_rating=round(avg_rating, 2),
        by_meal=by_meal,
        by_date=by_date
    )


@router.delete("/{feedback_id}")
def delete_feedback(
    feedback_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Delete a feedback entry - students can delete their own, managers can delete any."""
    feedback = db.query(FoodFeedback).filter(FoodFeedback.id == feedback_id).first()
    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback not found")
    
    # Students can only delete their own, managers can delete any in their org
    if current_user.role == "student":
        if feedback.student_id != current_user.id:
            raise HTTPException(status_code=403, detail="Cannot delete others' feedback")
    elif current_user.role == "mess_manager":
        if feedback.organization_code != current_user.organization_code:
            raise HTTPException(status_code=403, detail="Cannot delete feedback from other organizations")
    
    db.delete(feedback)
    db.commit()
    return {"message": "Feedback deleted successfully"}