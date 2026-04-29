import asyncio
from database import engine, SessionLocal
from models import User, Organization
from sqlalchemy import text

with engine.begin() as conn:
    try:
        conn.execute(text("ALTER TABLE organizations ALTER COLUMN org_code TYPE VARCHAR(20);"))
        print("Increased organizations.org_code length to 20")
    except Exception as e:
        print(f"Failed to alter column length: {e}")

db = SessionLocal()

# Find managers without an organization_id
managers = db.query(User).filter(User.role == 'mess_manager', User.organization_id == None).all()
print(f"Found {len(managers)} managers missing organization_id")

for manager in managers:
    # Check if an organization with this code already exists
    org = db.query(Organization).filter(Organization.org_code == manager.organization_code).first()
    if not org:
        org = Organization(
            name=f"{manager.name}'s Mess",
            org_code=manager.organization_code,
            created_by=manager.id
        )
        db.add(org)
        db.flush()
        print(f"Created organization for {manager.email} with code {org.org_code}")
    
    manager.organization_id = org.id
    db.commit()

# Also update students who belong to these organizations
students = db.query(User).filter(User.role == 'student', User.organization_id == None).all()
print(f"Found {len(students)} students missing organization_id")

for student in students:
    if student.organization_code:
        org = db.query(Organization).filter(Organization.org_code == student.organization_code).first()
        if org:
            student.organization_id = org.id
            db.commit()

print("Done fixing missing organizations.")
