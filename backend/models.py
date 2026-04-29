from sqlalchemy import Column, Integer, String, Float, Date, DateTime, Enum as SQLEnum, ForeignKey, JSON
from sqlalchemy.sql import func
from database import Base
import enum


class UserRole(str, enum.Enum):
    admin = "admin"
    mess_manager = "mess_manager"
    student = "student"

class Organization(Base):
    __tablename__ = "organizations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    org_code = Column(String(20), unique=True, index=True, nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password = Column(String(255), nullable=False)
    role = Column(String(50), default="mess_manager", nullable=False)
    roll_number = Column(String(50), nullable=True)
    organization_code = Column(String(50), nullable=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=True)
    profile_image = Column(String(500), nullable=True)
    provider = Column(String(50), default="local")
    provider_id = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False)
    meal = Column(String(20), nullable=False)  # breakfast, lunch, dinner
    students = Column(Integer, nullable=False)
    organization_code = Column(String(50), nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class FoodCooked(Base):
    __tablename__ = "food_cooked"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False)
    meal = Column(String(20), nullable=False)
    rice_kg = Column(Float, default=0)
    wheat_kg = Column(Float, default=0)
    dal_kg = Column(Float, default=0)
    vegetables_kg = Column(Float, default=0)
    milk_liters = Column(Float, default=0)
    eggs_units = Column(Float, default=0)
    poha_kg = Column(Float, default=0)
    curd_kg = Column(Float, default=0)
    oil_liters = Column(Float, default=0)
    chapati_count = Column(Integer, default=0)
    other_items = Column(String(500), default="")
    items = Column(JSON, nullable=True) # Dynamic storage for all items
    metrics = Column(JSON, nullable=True) # Derived metrics: efficiency, waste_proxy, etc.
    organization_code = Column(String(50), nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Waste(Base):
    __tablename__ = "waste"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False)
    meal = Column(String(20), nullable=False)
    waste_kg = Column(Float, nullable=False)
    organization_code = Column(String(50), nullable=True)
    waste_type = Column(String(50), default="mixed")  # cooked, raw, plate
    notes = Column(String(500), default="")
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Inventory(Base):
    __tablename__ = "inventory"

    id = Column(Integer, primary_key=True, index=True)
    item_name = Column(String(100), nullable=False)
    category = Column(String(50), default="general")
    item_type = Column(String(50), default="solid")
    quantity_kg = Column(Float, nullable=False)
    unit = Column(String(20), default="kg")
    min_threshold = Column(Float, default=10)
    daily_usage = Column(Float, default=0)
    normalized_name = Column(String(100), index=True) # For reliable matching
    organization_code = Column(String(50), nullable=True)
    expiry_date = Column(Date, nullable=True)
    last_updated = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    updated_by = Column(Integer, ForeignKey("users.id"))


class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False)
    meal = Column(String(20), default="lunch")
    predicted_students = Column(Integer, nullable=False)
    actual_students = Column(Integer, nullable=True)
    model_version = Column(String(50), default="v1")
    confidence = Column(Float, nullable=True)
    organization_code = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class StudentAttendance(Base):
    __tablename__ = "student_attendance"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(Date, nullable=False)
    meal = Column(String(20), nullable=False)  # breakfast, lunch, dinner
    status = Column(String(20), nullable=False)  # coming, not_coming
    marked_at = Column(DateTime(timezone=True), server_default=func.now())


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(String(500), nullable=False)
    type = Column(String(50), default="info")  # info, warning, success, error
    is_read = Column(Integer, default=0)  # 0: unread, 1: read
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Menu(Base):
    __tablename__ = "menus"
    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, index=True)
    organization_code = Column(String(50), nullable=True, index=True)
    breakfast = Column(String(500), default="")
    lunch = Column(String(500), default="")
    dinner = Column(String(500), default="")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class MealTiming(Base):
    __tablename__ = "meal_timings"
    id = Column(Integer, primary_key=True, index=True)
    meal_type = Column(String(50), unique=True, index=True) # breakfast, lunch, dinner
    start_time = Column(String(5)) # HH:mm format
    end_time = Column(String(5)) # HH:mm format
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())


class FoodFeedback(Base):
    __tablename__ = "food_feedback"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(Date, nullable=False)
    meal = Column(String(20), nullable=False)  # breakfast, lunch, dinner
    food_item = Column(String(255), nullable=False)  # Name of the food item
    rating = Column(Integer, nullable=False)  # 1-5 rating
    comment = Column(String(500), nullable=True)
    organization_code = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
