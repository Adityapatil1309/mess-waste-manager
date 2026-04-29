from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Inventory
from schemas import InventoryCreate, InventoryUpdate, InventoryResponse
from auth import get_current_user
from typing import List
from datetime import date, timedelta
from utils.notifications import create_notification

router = APIRouter(prefix="/api/inventory", tags=["Inventory"])


def check_and_notify(db: Session, item: Inventory, user_id: int):
    """Check stock levels and expiry, create notifications if needed."""
    # Low Stock Check
    if item.quantity_kg <= item.min_threshold:
        level = "CRITICAL" if item.quantity_kg <= item.min_threshold * 0.5 else "LOW"
        create_notification(
            db, user_id, 
            f"📦 {level} STOCK: {item.item_name}", 
            f"{item.item_name} has only {item.quantity_kg} {item.unit} left. Consider restocking soon.",
            "warning" if level == "LOW" else "error"
        )
    
    # Expiry Check
    if item.expiry_date:
        days_to_expiry = (item.expiry_date - date.today()).days
        if days_to_expiry <= 3:
            msg = "EXPIRED!" if days_to_expiry < 0 else f"Expires in {days_to_expiry} days!"
            create_notification(
                db, user_id,
                f"🗓 EXPIRY ALERT: {item.item_name}",
                f"{item.item_name} {msg} Use it immediately to avoid waste.",
                "error" if days_to_expiry <= 0 else "warning"
            )


from utils.inventory_utils import normalize_name


@router.post("/", response_model=InventoryResponse)
def create_inventory_item(
    data: InventoryCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    org_code = current_user.organization_code or ""
    normalized = normalize_name(data.item_name)
    existing = db.query(Inventory).filter(
        Inventory.normalized_name == normalized,
        Inventory.organization_code == org_code
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Item already exists with this name.")

    item = Inventory(
        item_name=data.item_name,
        normalized_name=normalized,
        category=data.category,
        item_type=data.item_type,
        quantity_kg=data.quantity_kg,
        unit=data.unit,
        min_threshold=data.min_threshold,
        daily_usage=data.daily_usage,
        expiry_date=data.expiry_date,
        organization_code=org_code,
        updated_by=current_user.id
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    
    # Auto-notify if added item is already low stock/expiring (Non-blocking)
    try:
        check_and_notify(db, item, current_user.id)
    except Exception as e:
        print(f"Notification error: {e}")
    
    return item


@router.get("/", response_model=List[InventoryResponse])
def get_inventory(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    org_code = current_user.organization_code or ""
    query = db.query(Inventory)
    if current_user.role == "mess_manager":
        query = query.filter(Inventory.organization_code == org_code)
    return query.order_by(Inventory.item_name).all()


@router.get("/alerts")
def get_inventory_alerts(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    org_code = current_user.organization_code or ""
    query = db.query(Inventory)
    if current_user.role == "mess_manager":
        query = query.filter(Inventory.organization_code == org_code)
    items = query.all()
    low_stock = []
    expiring_soon = []

    for item in items:
        if item.quantity_kg <= item.min_threshold:
            low_stock.append({
                "id": item.id,
                "item_name": item.item_name,
                "quantity_kg": item.quantity_kg,
                "min_threshold": item.min_threshold,
                "unit": item.unit,
                "status": "critical" if item.quantity_kg <= item.min_threshold * 0.5 else "low"
            })
        if item.expiry_date:
            days_to_expiry = (item.expiry_date - date.today()).days
            if days_to_expiry <= 7:
                expiring_soon.append({
                    "id": item.id,
                    "item_name": item.item_name,
                    "expiry_date": item.expiry_date.isoformat(),
                    "days_remaining": days_to_expiry,
                    "status": "expired" if days_to_expiry < 0 else "expiring"
                })

    return {
        "low_stock": low_stock,
        "expiring_soon": expiring_soon,
        "total_alerts": len(low_stock) + len(expiring_soon)
    }


@router.put("/{item_id}", response_model=InventoryResponse)
def update_inventory(
    item_id: int,
    data: InventoryUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    org_code = current_user.organization_code or ""
    item = db.query(Inventory).filter(Inventory.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    if current_user.role == "mess_manager" and (item.organization_code or "") != org_code:
        raise HTTPException(status_code=403, detail="Not authorized to modify this item")

    if data.item_name is not None:
        item.item_name = data.item_name
        item.normalized_name = normalize_name(data.item_name)
    if data.category is not None:
        item.category = data.category
    if data.item_type is not None:
        item.item_type = data.item_type
    if data.unit is not None:
        item.unit = data.unit
    if data.quantity_kg is not None:
        item.quantity_kg = data.quantity_kg
    if data.min_threshold is not None:
        item.min_threshold = data.min_threshold
    if data.daily_usage is not None:
        item.daily_usage = data.daily_usage
    if data.expiry_date is not None:
        item.expiry_date = data.expiry_date
    item.updated_by = current_user.id

    db.commit()
    db.refresh(item)
    
    # Auto-notify on update
    check_and_notify(db, item, current_user.id)
    
    return item


@router.delete("/{item_id}")
def delete_inventory_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    org_code = current_user.organization_code or ""
    item = db.query(Inventory).filter(Inventory.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    if current_user.role == "mess_manager" and (item.organization_code or "") != org_code:
        raise HTTPException(status_code=403, detail="Not authorized to delete this item")
    db.delete(item)
    db.commit()
    return {"message": "Item deleted successfully"}
