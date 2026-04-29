from sqlalchemy.orm import Session
from models import Inventory, FoodCooked, Attendance
from utils.inventory_utils import normalize_name
from sqlalchemy import func
from datetime import date, timedelta

# Core items that are always present in the system
# These correspond to the hardcoded columns in FoodCooked
STATIC_CORE_ITEMS = {
    "rice_kg": {"name": "Rice", "unit": "kg", "category": "Grains", "factor": 0.15},
    "dal_kg": {"name": "Dal", "unit": "kg", "category": "Pulses", "factor": 0.05},
    "vegetables_kg": {"name": "Vegetables", "unit": "kg", "category": "Produce", "factor": 0.12},
    "wheat_kg": {"name": "Wheat / Atta", "unit": "kg", "category": "Grains", "factor": 0.08},
    "milk_liters": {"name": "Milk", "unit": "liters", "category": "Dairy", "factor": 0.2}
}

# Mapping common names to core item keys for matching
CORE_ITEM_MAPPING = {
    "rice": "rice_kg",
    "dal": "dal_kg",
    "vegetables": "vegetables_kg",
    "veg": "vegetables_kg",
    "wheat": "wheat_kg",
    "atta": "wheat_kg",
    "milk": "milk_liters"
}

def get_consumption_factor(item_name: str, learned_factors: dict = None) -> float:
    """Returns the kg/student factor for an item, preferring learned data."""
    norm = normalize_name(item_name)
    
    # Check learned factors first (Dynamic Intelligence)
    if learned_factors and norm in learned_factors:
        return learned_factors[norm]
    
    # Check core items mapping
    if norm in CORE_ITEM_MAPPING:
        key = CORE_ITEM_MAPPING[norm]
        return STATIC_CORE_ITEMS[key]["factor"]
    
    # Default fallback factor
    return 0.05 

def get_learned_consumption_factors(db: Session, org_code: str, days: int = 14):
    """
    Calculates historical consumption factors: SUM(Quantity) / SUM(Students).
    Uses a moving window (default 14 days) for stability.
    """
    start_date = date.today() - timedelta(days=days)
    
    # 1. Get attendance map (date, meal) -> students
    att_records = db.query(Attendance.date, Attendance.meal, Attendance.students).filter(
        Attendance.date >= start_date,
        Attendance.organization_code == org_code
    ).all()
    att_map = {(r.date, r.meal): r.students for r in att_records}
    
    # 2. Get cooking records
    food_records = db.query(FoodCooked).filter(
        FoodCooked.date >= start_date,
        FoodCooked.organization_code == org_code
    ).all()
    
    item_stats = {} # norm_name -> {"qty": 0, "students": 0}
    
    for rec in food_records:
        students = att_map.get((rec.date, rec.meal))
        if not students or students <= 0:
            continue
            
        # Process core columns defined in registry
        for key, info in STATIC_CORE_ITEMS.items():
            norm = normalize_name(info["name"])
            qty = getattr(rec, key, 0) or 0
            if qty > 0:
                if norm not in item_stats: item_stats[norm] = {"qty": 0, "students": 0}
                item_stats[norm]["qty"] += qty
                item_stats[norm]["students"] += students
                
        # Process dynamic JSON items
        if rec.items:
            for item_name, qty in rec.items.items():
                norm = normalize_name(item_name)
                try:
                    qty_val = float(qty)
                except: continue
                if qty_val > 0:
                    if norm not in item_stats: item_stats[norm] = {"qty": 0, "students": 0}
                    item_stats[norm]["qty"] += qty_val
                    item_stats[norm]["students"] += students
                    
    # Calculate final factors with weighted average logic implicitly by summing totals
    learned_factors = {}
    for norm, data in item_stats.items():
        if data["students"] > 0:
            # Resulting factor is (Total Cooked / Total Students) over the window
            learned_factors[norm] = round(data["qty"] / data["students"], 4)
            
    return learned_factors

def get_unified_items(db: Session, org_code: str):
    """
    Returns a list of all items (Core + Inventory) deduplicated by normalized name.
    """
    # Get learned intelligence
    learned_factors = get_learned_consumption_factors(db, org_code)
    
    # Start with core items
    unified_items = {}
    for key, info in STATIC_CORE_ITEMS.items():
        norm = normalize_name(info["name"])
        unified_items[norm] = {
            "id": key,
            "name": info["name"],
            "unit": info["unit"],
            "category": info["category"],
            "is_core": True,
            "factor": get_consumption_factor(info["name"], learned_factors)
        }
    
    # Add inventory items
    inv_q = db.query(Inventory)
    if org_code:
        inv_q = inv_q.filter(Inventory.organization_code == org_code)
    inventory_items = inv_q.all()

    for item in inventory_items:
        norm = item.normalized_name
        if norm not in unified_items:
            unified_items[norm] = {
                "id": f"inv_{item.id}",
                "name": item.item_name,
                "unit": item.unit,
                "category": item.category,
                "is_core": False,
                "factor": get_consumption_factor(item.item_name, learned_factors),
                "current_stock": item.quantity_kg,
                "min_stock": item.min_threshold
            }
        else:
            # Update existing core item with current stock if match found
            unified_items[norm]["current_stock"] = item.quantity_kg
            unified_items[norm]["min_stock"] = item.min_threshold
            unified_items[norm]["inventory_id"] = item.id

    return unified_items
