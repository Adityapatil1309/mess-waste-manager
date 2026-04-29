import random
import string
from database import engine, SessionLocal
from models import User, Organization

db = SessionLocal()

managers = db.query(User).filter(User.role == 'mess_manager').all()
org_dict = {}

count = 0
for manager in managers:
    org = db.query(Organization).filter(Organization.id == manager.organization_id).first()
    if org and org.created_by != manager.id:
        print(f"Unmerging manager {manager.id} ({manager.name}) from Org {org.id}")
        # Generate new tenant ID and new invite code
        new_tenant_id = ''.join(random.choices(string.ascii_uppercase + string.digits, k=10))
        new_invite_code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
        
        new_org = Organization(
            name=f"{manager.name}'s Mess",
            org_code=new_invite_code,
            created_by=manager.id
        )
        db.add(new_org)
        db.flush()
        
        manager.organization_id = new_org.id
        manager.organization_code = new_tenant_id
        count += 1
        
        # We don't move students automatically since we don't know which manager they belong to.
        # Students will just stay with the original manager of the org they joined.

if count > 0:
    db.commit()
    print(f"Unmerged {count} managers. They now have unique organizations and tenant IDs.")
else:
    print("No managers were sharing organizations.")

# Let's also check if any manager has an empty Tenant ID
for manager in managers:
    if not manager.organization_code or manager.organization_code.strip() == "":
        new_tenant_id = ''.join(random.choices(string.ascii_uppercase + string.digits, k=10))
        print(f"Assigning new Tenant ID to manager {manager.id} ({manager.name})")
        manager.organization_code = new_tenant_id
        db.commit()

