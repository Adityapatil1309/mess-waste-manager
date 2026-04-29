import random
from datetime import date, timedelta
from database import SessionLocal
from models import Attendance, FoodCooked, Waste, User
from ml import train_model

def seed_org(org_code):
    db = SessionLocal()
    # Find a manager id for this org or use 1
    manager = db.query(User).filter(User.organization_code == org_code, User.role == 'mess_manager').first()
    manager_id = manager.id if manager else 1

    print(f"Cleaning existing stats for {org_code}...")
    db.query(Attendance).filter(Attendance.organization_code == org_code).delete()
    db.query(FoodCooked).filter(FoodCooked.organization_code == org_code).delete()
    db.query(Waste).filter(Waste.organization_code == org_code).delete()
    db.commit()

    print(f"Seeding 35 days of history for {org_code}...")
    today = date.today()
    for i in range(35, -1, -1):  # 35 days ago until Today (inclusive)
        d = today - timedelta(days=i)
        
        # 1. ATTENDANCE
        base_students = random.randint(320, 380)
        db.add(Attendance(
            date=d, meal='lunch', students=base_students, 
            organization_code=org_code, created_by=manager_id
        ))

        # 2. FOOD COOKED (Avg 0.38kg per student)
        total_kg = base_students * 0.38
        db.add(FoodCooked(
            date=d, meal='lunch', 
            rice_kg=total_kg * 0.45, dal_kg=total_kg * 0.2, vegetables_kg=total_kg * 0.35,
            organization_code=org_code, created_by=manager_id
        ))

        # 3. WASTE (5-12%)
        waste_kg = total_kg * random.uniform(0.05, 0.12)
        db.add(Waste(
            date=d, meal='lunch', waste_kg=waste_kg, 
            notes="Daily waste",
            organization_code=org_code, created_by=manager_id
        ))

    db.commit()
    print(f"Successfully seeded {org_code}.")
    
    print(f"Pre-training AI model for {org_code}...")
    try:
        train_model(db, "lunch", org_code)
        print("AI model ready and trained.")
    except Exception as e:
        print(f"Training error: {e}")
    db.close()

if __name__ == "__main__":
    # Seed the most active organizations known from user list
    for code in ["123456", "1ab2", "a", ""]:
        if code is not None:
             seed_org(code)
    print("\n--- ALL SYSTEMS INITIALIZED AND LIVE ---")
