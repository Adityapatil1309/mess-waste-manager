from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_
from database import get_db
from models import User, StudentAttendance, Menu, Organization
from schemas import (
    StudentAttendanceCreate, StudentAttendanceResponse,
    StudentProfileUpdate, UserResponse, MenuCreate, MenuResponse, JoinOrgRequest
)
from auth import get_current_user, create_access_token
from typing import List, Optional
from datetime import date, datetime, timedelta
from websocket_manager import ws_manager

router = APIRouter(prefix="/api/student", tags=["Student Portal"])


def require_student(current_user: User = Depends(get_current_user)):
    if current_user.role not in ("student", "admin"):
        raise HTTPException(status_code=403, detail="Student access required")
    return current_user


# ─── Join Organization ─────────────────────────────────────────
@router.post("/join-organization")
def join_organization(
    data: JoinOrgRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student)
):
    org = db.query(Organization).filter(Organization.org_code == data.org_code).first()
    if not org:
        raise HTTPException(status_code=400, detail="Invalid organization code")
        
    # Find the manager to inherit the true tenant ID
    manager = db.query(User).filter(User.id == org.created_by).first()
    
    current_user.organization_code = manager.organization_code if manager else org.org_code
    current_user.organization_id = org.id
    db.commit()
    db.refresh(current_user)
    
    access_token = create_access_token(
        data={"sub": current_user.email, "role": current_user.role, "name": current_user.name, "id": current_user.id, "org_code": current_user.organization_code}
    )
    return {"access_token": access_token}

# ─── Mark Attendance ──────────────────────────────────────────
@router.post("/attendance", response_model=StudentAttendanceResponse)
async def mark_attendance(
    data: StudentAttendanceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student)
):
    # Check if already marked for this date + meal
    existing = db.query(StudentAttendance).filter(
        and_(
            StudentAttendance.student_id == current_user.id,
            StudentAttendance.date == data.date,
            StudentAttendance.meal == data.meal
        )
    ).first()

    if existing:
        # Update existing record
        existing.status = data.status
        db.commit()
        db.refresh(existing)
        # Real-time sync: Notify managers
        await ws_manager.broadcast({"type": "DASHBOARD_REFRESH", "meal": data.meal})
        return existing

    record = StudentAttendance(
        student_id=current_user.id,
        date=data.date,
        meal=data.meal,
        status=data.status,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    
    # Real-time sync: Notify managers
    await ws_manager.broadcast({"type": "DASHBOARD_REFRESH", "meal": data.meal})
    
    return record


# ─── Get My Attendance History ────────────────────────────────
@router.get("/attendance", response_model=List[StudentAttendanceResponse])
def get_my_attendance(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student)
):
    query = db.query(StudentAttendance).filter(
        StudentAttendance.student_id == current_user.id
    )
    if start_date:
        query = query.filter(StudentAttendance.date >= start_date)
    if end_date:
        query = query.filter(StudentAttendance.date <= end_date)
    return query.order_by(StudentAttendance.date.desc()).limit(limit).all()


# ─── Today's Status ──────────────────────────────────────────
@router.get("/attendance/today")
def get_today_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student)
):
    today = date.today()
    records = db.query(StudentAttendance).filter(
        and_(
            StudentAttendance.student_id == current_user.id,
            StudentAttendance.date == today
        )
    ).all()

    meals_marked = {r.meal: r.status for r in records}
    return {
        "date": today.isoformat(),
        "meals_marked": meals_marked,
        "breakfast": meals_marked.get("breakfast"),
        "lunch": meals_marked.get("lunch"),
        "dinner": meals_marked.get("dinner"),
        "all_marked": len(meals_marked) == 3,
    }


# ─── Today's Menu (static for now, can be made dynamic) ──────
@router.get("/menu")
def get_today_menu(
    target_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    d = target_date or date.today()
    menu = db.query(Menu).filter(
        Menu.date == d,
        Menu.organization_code == current_user.organization_code
    ).first()

    if not menu:
        # Return default structure if no menu set yet
        return {
            "date": d.strftime("%A, %d %B %Y"),
            "meals": {
                "breakfast": {"time": "7:30 AM - 9:00 AM", "items": ["Not set by manager"]},
                "lunch": {"time": "12:00 PM - 2:00 PM", "items": ["Not set by manager"]},
                "dinner": {"time": "7:00 PM - 9:00 PM", "items": ["Not set by manager"]}
            }
        }

    return {
        "date": menu.date.strftime("%A, %d %B %Y"),
        "meals": {
            "breakfast": {"time": "7:30 AM - 9:00 AM", "items": [i.strip() for i in menu.breakfast.split(",") if i.strip()]},
            "lunch": {"time": "12:00 PM - 2:00 PM", "items": [i.strip() for i in menu.lunch.split(",") if i.strip()]},
            "dinner": {"time": "7:00 PM - 9:00 PM", "items": [i.strip() for i in menu.dinner.split(",") if i.strip()]}
        }
    }


@router.post("/manager/menu", response_model=MenuResponse)
def set_menu(
    data: MenuCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in ("admin", "mess_manager"):
        raise HTTPException(status_code=403, detail="Manager access required")
    
    # Check if menu already exists for this date
    menu = db.query(Menu).filter(
        Menu.date == data.date,
        Menu.organization_code == current_user.organization_code
    ).first()

    if menu:
        menu.breakfast = data.breakfast
        menu.lunch = data.lunch
        menu.dinner = data.dinner
    else:
        menu = Menu(
            date=data.date,
            organization_code=current_user.organization_code,
            breakfast=data.breakfast,
            lunch=data.lunch,
            dinner=data.dinner
        )
        db.add(menu)
    
    db.commit()
    db.refresh(menu)
    return menu


# ─── Student Profile ─────────────────────────────────────────
@router.get("/profile", response_model=UserResponse)
def get_profile(current_user: User = Depends(require_student)):
    return current_user


@router.put("/profile")
def update_profile(
    data: StudentProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student)
):
    if data.name is not None:
        current_user.name = data.name
    if data.roll_number is not None:
        current_user.roll_number = data.roll_number
    if data.organization_code is not None and data.organization_code.strip() != "":
        org = db.query(Organization).filter(Organization.org_code == data.organization_code.strip().upper()).first()
        if not org:
            raise HTTPException(status_code=400, detail="Invalid organization code")
        manager = db.query(User).filter(User.id == org.created_by).first()
        current_user.organization_code = manager.organization_code if manager else org.org_code
        current_user.organization_id = org.id

    db.commit()
    db.refresh(current_user)
    
    access_token = create_access_token(
        data={"sub": current_user.email, "role": current_user.role, "name": current_user.name, "id": current_user.id, "org_code": current_user.organization_code}
    )
    return {"access_token": access_token}


# ─── Assignment Info ─────────────────────────────────────────
@router.get("/assignment-info")
def get_assignment_info(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student)
):
    if not current_user.organization_code:
        return {"assigned": False, "message": "No organization code provided"}
    
    managers = db.query(User).filter(
        and_(
            User.role == "mess_manager",
            User.organization_code == current_user.organization_code
        )
    ).all()
    
    return {
        "assigned": len(managers) > 0,
        "organization_code": current_user.organization_code,
        "managers": [{"name": m.name, "email": m.email} for m in managers]
    }


# ─── Manager: Live Student RSVPs List ────────────────────────
@router.get("/manager/live-details")
def manager_live_details(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in ("admin", "mess_manager"):
        raise HTTPException(status_code=403, detail="Manager access required")

    today = date.today()
    query = db.query(StudentAttendance, User.name, User.roll_number).join(
        User, StudentAttendance.student_id == User.id
    ).filter(StudentAttendance.date == today)

    if current_user.role == "mess_manager" and current_user.organization_code:
        query = query.filter(User.organization_code == current_user.organization_code)

    records = query.all()
    
    return [
        {
            "student_name": r.name,
            "roll_number": r.roll_number,
            "meal": r.StudentAttendance.meal,
            "status": r.StudentAttendance.status,
            "marked_at": r.StudentAttendance.marked_at.isoformat() if r.StudentAttendance.marked_at else None
        }
        for r in records
    ]
@router.get("/manager/summary")
def manager_attendance_summary(
    target_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in ("admin", "mess_manager"):
        raise HTTPException(status_code=403, detail="Manager access required")

    d = target_date or date.today()

    
    # Isolate strictly by Organization Code
    query = db.query(StudentAttendance).join(User, StudentAttendance.student_id == User.id).filter(
        StudentAttendance.date == d
    )
    
    student_query = db.query(User).filter(User.role == "student")
    
    if current_user.role == "mess_manager" and current_user.organization_code:
        query = query.filter(User.organization_code == current_user.organization_code)
        student_query = student_query.filter(User.organization_code == current_user.organization_code)


    records = query.all()
    total_students = student_query.count()

    coming = [r for r in records if r.status == "coming"]
    not_coming = [r for r in records if r.status == "not_coming"]

    meals = {}
    for meal in ["breakfast", "lunch", "dinner"]:
        meal_records = [r for r in records if r.meal == meal]
        meals[meal] = {
            "coming": len([r for r in meal_records if r.status == "coming"]),
            "not_coming": len([r for r in meal_records if r.status == "not_coming"]),
            "total_marked": len(meal_records),
        }

    return {
        "date": d.isoformat(),
        "total_students_registered": total_students,
        "total_coming": len(coming),
        "total_not_coming": len(not_coming),
        "total_marked": len(records),
        "unmarked": max(0, total_students * 3 - len(records)),
        "meals": meals,
    }


# ─── Manager: Student Attendance CSV Export ───────────────────
@router.get("/manager/export")
def export_student_attendance(
    days: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in ("admin", "mess_manager"):
        raise HTTPException(status_code=403, detail="Manager access required")

    from datetime import date, datetime, timedelta
    from fastapi.responses import Response
    import csv, io

    start = date.today() - timedelta(days=days)
    
    query = db.query(StudentAttendance).join(User, StudentAttendance.student_id == User.id).filter(
        StudentAttendance.date >= start
    )
    
    if current_user.role == "mess_manager" and current_user.organization_code:
        query = query.filter(User.organization_code == current_user.organization_code)
        
    records = query.order_by(StudentAttendance.date).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Student ID", "Date", "Meal", "Status", "Marked At"])
    for r in records:
        writer.writerow([r.student_id, r.date.isoformat(), r.meal, r.status,
                         r.marked_at.isoformat() if r.marked_at else ""])

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=student_attendance_{days}d.csv"}
    )
