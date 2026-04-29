import asyncio
from database import engine, SessionLocal
from models import User, Organization

db = SessionLocal()

print("--- ORGANIZATIONS ---")
orgs = db.query(Organization).all()
for org in orgs:
    print(f"ID: {org.id}, Name: {org.name}, Code: {org.org_code}, Created By: {org.created_by}")

print("\n--- MANAGERS ---")
managers = db.query(User).filter(User.role == 'mess_manager').all()
for m in managers:
    print(f"ID: {m.id}, Name: {m.name}, Email: {m.email}, TenantID: {m.organization_code}, OrgID: {m.organization_id}")

