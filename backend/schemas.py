from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Literal
from datetime import date, datetime


# ─── Auth Schemas ──────────────────────────────────────────────
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str = "mess_manager"
    roll_number: Optional[str] = None
    organization_code: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str



class SocialLoginRequest(BaseModel):
    provider: str
    token: str
    role: str = "student"
    roll_number: Optional[str] = None
    organization_code: Optional[str] = None


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str
    roll_number: Optional[str] = None
    organization_code: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None


# ─── Attendance Schemas ────────────────────────────────────────
class AttendanceCreate(BaseModel):
    date: date
    meal: Literal["breakfast", "lunch", "dinner"]
    students: int = Field(ge=0, le=10000)


class AttendanceResponse(BaseModel):
    id: int
    date: date
    meal: str
    students: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ─── Food Cooked Schemas ──────────────────────────────────────
class FoodCookedCreate(BaseModel):
    date: date
    meal: Literal["breakfast", "lunch", "dinner"]
    rice_kg: float = Field(default=0, ge=0)
    wheat_kg: float = Field(default=0, ge=0)
    dal_kg: float = Field(default=0, ge=0)
    vegetables_kg: float = Field(default=0, ge=0)
    milk_liters: float = Field(default=0, ge=0)
    eggs_units: float = Field(default=0, ge=0)
    poha_kg: float = Field(default=0, ge=0)
    curd_kg: float = Field(default=0, ge=0)
    oil_liters: float = Field(default=0, ge=0)
    chapati_count: int = Field(default=0, ge=0)
    other_items: str = ""
    items: Optional[dict[str, float]] = None


class FoodCookedResponse(BaseModel):
    id: int
    date: date
    meal: str
    rice_kg: float
    wheat_kg: float
    dal_kg: float
    vegetables_kg: float
    milk_liters: float
    eggs_units: float
    poha_kg: float
    curd_kg: float
    oil_liters: float
    chapati_count: int
    other_items: str
    items: Optional[dict[str, float]] = None
    metrics: Optional[dict] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ─── Waste Schemas ─────────────────────────────────────────────
class WasteCreate(BaseModel):
    date: date
    meal: Literal["breakfast", "lunch", "dinner"]
    waste_kg: float = Field(ge=0)
    waste_type: str = "mixed"
    notes: str = ""


class WasteResponse(BaseModel):
    id: int
    date: date
    meal: str
    waste_kg: float
    waste_type: str
    notes: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ─── Inventory Schemas ─────────────────────────────────────────
class InventoryCreate(BaseModel):
    item_name: str = Field(..., min_length=2, max_length=50)
    category: str = "general"
    item_type: str = "solid"
    quantity_kg: float = Field(ge=0)
    unit: str = "kg"
    min_threshold: float = Field(default=10, ge=0)
    daily_usage: float = Field(default=0, ge=0)
    expiry_date: Optional[date] = None


class InventoryUpdate(BaseModel):
    item_name: Optional[str] = Field(None, min_length=2, max_length=50)
    category: Optional[str] = None
    item_type: Optional[str] = None
    unit: Optional[str] = None
    quantity_kg: Optional[float] = Field(default=None, ge=0)
    min_threshold: Optional[float] = Field(default=None, ge=0)
    daily_usage: Optional[float] = Field(default=None, ge=0)
    expiry_date: Optional[date] = None


class InventoryResponse(BaseModel):
    id: int
    item_name: str
    normalized_name: Optional[str] = None
    category: str
    item_type: str
    quantity_kg: float
    unit: str
    min_threshold: float
    daily_usage: float = 0
    expiry_date: Optional[date] = None
    last_updated: Optional[datetime] = None

    class Config:
        from_attributes = True


# ─── Prediction Schemas ────────────────────────────────────────
class PredictionRequest(BaseModel):
    date: date
    meal: Literal["breakfast", "lunch", "dinner"] = "lunch"


class FuturePredictionRequest(BaseModel):
    days: int = Field(default=7, ge=1, le=30)
    meal: Literal["breakfast", "lunch", "dinner"] = "lunch"


class PredictionResponse(BaseModel):
    id: int
    date: date
    meal: str
    predicted_students: int
    confidence: Optional[float] = None
    model_version: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ─── Analytics Schemas ─────────────────────────────────────────
class DashboardStats(BaseModel):
    today_attendance: int
    predicted_attendance: int
    waste_percentage: float
    food_required_kg: float


class ProcurementSuggestion(BaseModel):
    item: str
    current_stock: float
    required: float
    to_procure: float
    unit: str


# ─── Student Schemas ───────────────────────────────────────────
class StudentAttendanceCreate(BaseModel):
    date: date
    meal: Literal["breakfast", "lunch", "dinner"]
    status: Literal["coming", "not_coming"]


class StudentAttendanceResponse(BaseModel):
    id: int
    student_id: int
    date: date
    meal: str
    status: str
    marked_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class StudentProfileUpdate(BaseModel):
    name: Optional[str] = None
    roll_number: Optional[str] = None
    organization_code: Optional[str] = None


class ManagerAttendanceSummary(BaseModel):
    date: str
    total_coming: int
    total_not_coming: int
    meals: dict


class NotificationResponse(BaseModel):
    id: int
    user_id: int
    title: str
    message: str
    type: str
    is_read: int
    created_at: datetime

    class Config:
        from_attributes = True


class MenuCreate(BaseModel):
    date: date
    breakfast: str
    lunch: str
    dinner: str


class MenuResponse(BaseModel):
    id: int
    date: date
    organization_code: Optional[str] = None
    breakfast: str
    lunch: str
    dinner: str
    created_at: datetime

    class Config:
        from_attributes = True

# ─── Meal Timing Schemas ───────────────────────────────────────
class MealTimingBase(BaseModel):
    meal_type: str
    start_time: str
    end_time: str

class MealTimingResponse(MealTimingBase):
    id: int
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True



class JoinOrgRequest(BaseModel):
    org_code: str

class UpdateOrgCodeRequest(BaseModel):
    new_org_code: str


# ─── Food Feedback Schemas ─────────────────────────────────────
class FoodFeedbackCreate(BaseModel):
    date: date
    meal: Literal["breakfast", "lunch", "dinner"]
    food_item: str = Field(..., min_length=1, max_length=255)
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = Field(default=None, max_length=500)


class FoodFeedbackResponse(BaseModel):
    id: int
    student_id: int
    date: date
    meal: str
    food_item: str
    rating: int
    comment: Optional[str] = None
    organization_code: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class FoodFeedbackSummary(BaseModel):
    food_item: str
    avg_rating: float
    total_feedback: int
    rating_breakdown: dict  # {1: count, 2: count, 3: count, 4: count, 5: count}


class FoodFeedbackStats(BaseModel):
    total_feedback: int
    average_rating: float
    by_meal: dict  # {"breakfast": avg, "lunch": avg, "dinner": avg}
    by_date: list  # [{"date": "2026-04-24", "avg_rating": 4.2, "count": 15}]


