import asyncio
from database import engine, SessionLocal
from models import User, Organization

db = SessionLocal()

# Find students who have an organization_id
students = db.query(User).filter(User.role == 'student', User.organization_id != None).all()
count = 0

for student in students:
    # Find their organization
    org = db.query(Organization).filter(Organization.id == student.organization_id).first()
    if org:
        # Find the manager of this org
        manager = db.query(User).filter(User.id == org.created_by).first()
        if manager and student.organization_code != manager.organization_code:
            print(f"Fixing student {student.email}: changing org_code from {student.organization_code} to {manager.organization_code}")
            student.organization_code = manager.organization_code
            count += 1

if count > 0:
    db.commit()
    print(f"Fixed {count} students.")
else:
    print("All students have the correct tenant ID.")

