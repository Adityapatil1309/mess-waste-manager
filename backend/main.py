import os
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from dotenv import load_dotenv
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
import requests
import secrets
import shutil
import time
from database import engine, get_db, Base
from models import User, UserRole, MealTiming, Organization
import random
import string
from schemas import UserCreate, UserLogin, UserResponse, Token, SocialLoginRequest, MealTimingBase, MealTimingResponse, UpdateOrgCodeRequest
from auth import hash_password, verify_password, create_access_token, get_current_user
from websocket_manager import ws_manager

from routes.attendance import router as attendance_router
from routes.food import router as food_router
from routes.waste import router as waste_router
from routes.inventory import router as inventory_router
from routes.prediction import router as prediction_router
from routes.analytics import router as analytics_router
from routes.report import router as report_router
from routes.student import router as student_router
from routes.notifications import router as notification_router
from routes.food_feedback import router as food_feedback_router
from routes.ml import router as ml_router

load_dotenv()

# Ensure uploads directory exists
os.makedirs("uploads", exist_ok=True)

# Create all tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AI Smart Mess Waste Management System",
    description="Intelligent waste management and attendance prediction for mess facilities",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static uploads
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# ws_manager moved to websocket_manager.py

@app.websocket("/api/ws/meal-timings")
async def websocket_meal_timings(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            # Just keep connection open
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)


# ─── Auth Routes ──────────────────────────────────────────────
@app.post("/api/auth/register", response_model=UserResponse, tags=["Authentication"])
def register(data: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    role = data.role if data.role in ["mess_manager", "student"] else "mess_manager"
    
    org_code = data.organization_code
    org_id = None

    if role == "mess_manager":
        # Generate a random 8-char uppercase code
        org_code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
        new_org = Organization(name=f"{data.name}'s Mess", org_code=org_code)
        db.add(new_org)
        db.flush() # flush to get ID
        org_id = new_org.id
    elif role == "student" and org_code:
        org = db.query(Organization).filter(Organization.org_code == org_code).first()
        if not org:
            raise HTTPException(status_code=400, detail="Invalid organization code")
        org_id = org.id
        manager = db.query(User).filter(User.id == org.created_by).first()
        org_code = manager.organization_code if manager else org.org_code

    user = User(
        name=data.name,
        email=data.email,
        password=hash_password(data.password),
        role=role,
        roll_number=data.roll_number,
        organization_code=org_code,
        organization_id=org_id
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    if role == "mess_manager" and org_id:
        # Update organization's created_by now that user has an ID
        org = db.query(Organization).filter(Organization.id == org_id).first()
        org.created_by = user.id
        db.commit()
        
    return user


@app.post("/api/auth/login", response_model=Token, tags=["Authentication"])
def login(data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not verify_password(data.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid email or password")


    invite_code = user.organization_code
    if user.role == "mess_manager" and user.organization_id:
        org = db.query(Organization).filter(Organization.id == user.organization_id).first()
        if org:
            invite_code = org.org_code

    access_token = create_access_token(
        data={"sub": user.email, "role": user.role, "name": user.name, "id": user.id, "org_code": user.organization_code, "invite_code": invite_code}
    )
    return {"access_token": access_token, "token_type": "bearer"}


@app.post("/api/auth/social-login", response_model=Token, tags=["Authentication"])
def social_login(data: SocialLoginRequest, db: Session = Depends(get_db)):
    email = None
    name = "Social User"
    provider_id = None
    profile_image = None
    
    if data.provider.lower() == "google":
        if data.token == "mock_google_token":
            email = "demo.student.google@example.com"
            name = "Google Mock User"
            provider_id = "google_mock_123"
            profile_image = "https://ui-avatars.com/api/?name=Google+User&background=DB4437&color=fff"
        else:
            try:
                # Verify Google token via userinfo endpoint
                google_url = f"https://www.googleapis.com/oauth2/v3/userinfo?access_token={data.token}"
                g_res = requests.get(google_url).json()
                if "error" in g_res:
                    raise ValueError("Invalid Google token")
                email = g_res.get("email")
                name = g_res.get("name")
                provider_id = g_res.get("sub")
                profile_image = g_res.get("picture")
            except Exception:
                raise HTTPException(status_code=400, detail="Invalid Google token")

    elif data.provider.lower() == "facebook":
        if data.token == "mock_facebook_token":
            email = "demo.student.facebook@example.com"
            name = "Facebook Mock User"
            provider_id = "facebook_mock_456"
            profile_image = "https://ui-avatars.com/api/?name=Facebook+User&background=4267B2&color=fff"
        else:
            try:
                # Verify Facebook token by querying the Graph API
                fb_url = f"https://graph.facebook.com/me?fields=id,name,email,picture&access_token={data.token}"
                fb_res = requests.get(fb_url).json()
                if "error" in fb_res:
                    raise ValueError("Invalid Facebook token")
                email = fb_res.get("email")
                name = fb_res.get("name")
                provider_id = fb_res.get("id")
                if "picture" in fb_res and "data" in fb_res["picture"]:
                    profile_image = fb_res["picture"]["data"].get("url")
                
                # If facebook doesn't return email, we can't tie it easily. Use a dummy string
                if not email:
                    email = f"{provider_id}@facebook.dummy.com"
                    
            except Exception:
                raise HTTPException(status_code=400, detail="Invalid Facebook token")
    else:
        raise HTTPException(status_code=400, detail="Unsupported provider")

    if not email:
        raise HTTPException(status_code=400, detail="Could not retrieve email from provider")

    user = db.query(User).filter(User.email == email).first()
    
    if not user:
        # Create a new user automatically for social login
        org_code_val = None
        org_id_val = None
        
        if data.role == "mess_manager":
            # Generate org for social-login managers too
            gen_code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
            new_org = Organization(name=f"{name}'s Mess", org_code=gen_code)
            db.add(new_org)
            db.flush()
            org_id_val = new_org.id
            org_code_val = gen_code
        elif data.role == "student" and data.organization_code:
            org = db.query(Organization).filter(Organization.org_code == data.organization_code).first()
            if org:
                manager = db.query(User).filter(User.id == org.created_by).first()
                org_code_val = manager.organization_code if manager else org.org_code
                org_id_val = org.id
        
        user = User(
            name=name,
            email=email,
            password=hash_password(secrets.token_urlsafe(16)),
            role=data.role,
            roll_number=data.roll_number if data.role == "student" else None,
            organization_code=org_code_val,
            organization_id=org_id_val,
            provider=data.provider.lower(),
            provider_id=provider_id,
            profile_image=profile_image
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
        if data.role == "mess_manager" and org_id_val:
            org = db.query(Organization).filter(Organization.id == org_id_val).first()
            org.created_by = user.id
            db.commit()
    else:
        # Update existing user's info if it is currently unset
        updated = False
        if not user.role or user.role == "mess_manager": # Allow updating role if it's default
             if data.role and data.role != user.role:
                user.role = data.role
                updated = True
        
        if (not user.organization_code or user.organization_code == "") and data.organization_code:
            org = db.query(Organization).filter(Organization.org_code == data.organization_code).first()
            if org:
                manager = db.query(User).filter(User.id == org.created_by).first()
                user.organization_code = manager.organization_code if manager else org.org_code
                user.organization_id = org.id
                updated = True
            
        if not user.roll_number and data.roll_number:
            user.roll_number = data.roll_number
            updated = True

        if not user.provider_id:
            user.provider = data.provider.lower()
            user.provider_id = provider_id
            updated = True
            
        if profile_image and not user.profile_image:
            user.profile_image = profile_image
            updated = True
            
        if updated:
            db.commit()

    invite_code = user.organization_code
    if user.role == "mess_manager" and user.organization_id:
        org = db.query(Organization).filter(Organization.id == user.organization_id).first()
        if org:
            invite_code = org.org_code

    access_token = create_access_token(
        data={"sub": user.email, "role": user.role, "name": user.name, "id": user.id, "org_code": user.organization_code, "invite_code": invite_code}
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.put("/api/organization/update-code", tags=["Organization"])
def update_org_code(
    data: UpdateOrgCodeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "mess_manager":
        raise HTTPException(status_code=403, detail="Only managers can update the organization code")
        
    code = data.new_org_code.strip().upper()
    if len(code) < 6 or len(code) > 10 or not code.isalnum():
        raise HTTPException(status_code=400, detail="Code must be 6-10 alphanumeric characters")
        
    existing = db.query(Organization).filter(Organization.org_code == code).first()
    if existing:
        raise HTTPException(status_code=400, detail="This organization code is already taken")
        
    org = db.query(Organization).filter(Organization.id == current_user.organization_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
        
    org.org_code = code
    db.commit()
    
    invite_code = code
    access_token = create_access_token(
        data={"sub": current_user.email, "role": current_user.role, "name": current_user.name, "id": current_user.id, "org_code": current_user.organization_code, "invite_code": invite_code}
    )
    return {"message": "Organization code updated successfully", "new_code": code, "access_token": access_token}


@app.get("/api/auth/me", response_model=UserResponse, tags=["Authentication"])
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@app.post("/api/upload-profile/{user_id}", tags=["Authentication"])
async def upload_profile_image(user_id: int, file: UploadFile = File(...), current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to update this profile")

    if file.content_type not in ["image/jpeg", "image/jpg"]:
        raise HTTPException(status_code=400, detail="Only JPEG format is supported")
    
    # Validate file size (<= 2MB) — read once, use the buffer
    MAX_SIZE = 2 * 1024 * 1024
    contents = await file.read()
    if len(contents) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="File size must be <= 2MB")
    
    # Save the file with specific naming convention
    filename = f"user_{user_id}.jpg"
    file_path = os.path.join("uploads", filename)
    
    with open(file_path, "wb") as buffer:
        buffer.write(contents)
    
    # Generate URL
    image_url = f"http://localhost:8000/uploads/{filename}"
    
    # Update user in DB
    current_user.profile_image = image_url
    db.commit()
    db.refresh(current_user)
    
    return {"message": "Profile image updated successfully", "profile_image": image_url}

# ─── Meal Timings Routes ───────────────────────────────────────
@app.get("/api/meal-timings", response_model=list[MealTimingResponse], tags=["Timings"])
def get_meal_timings(db: Session = Depends(get_db)):
    timings = db.query(MealTiming).all()
    if not timings:
        # Seed defaults
        defaults = [
            MealTiming(meal_type="breakfast", start_time="07:30", end_time="09:00"),
            MealTiming(meal_type="lunch", start_time="12:00", end_time="14:00"),
            MealTiming(meal_type="dinner", start_time="19:00", end_time="21:00")
        ]
        db.bulk_save_objects(defaults)
        db.commit()
        timings = db.query(MealTiming).all()
    return timings

@app.post("/api/meal-timings", response_model=MealTimingResponse, tags=["Timings"])
async def update_meal_timing(data: MealTimingBase, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "mess_manager":
        raise HTTPException(status_code=403, detail="Only managers can update meal timings")
    
    if data.start_time >= data.end_time:
        raise HTTPException(status_code=400, detail="Start time must be before end time")
        
    # Find timing
    timing = db.query(MealTiming).filter(MealTiming.meal_type == data.meal_type).first()
    if not timing:
        # Create if not exists
        timing = MealTiming(meal_type=data.meal_type, start_time=data.start_time, end_time=data.end_time)
        db.add(timing)
    else:
        timing.start_time = data.start_time
        timing.end_time = data.end_time
        
    db.commit()
    db.refresh(timing)
    
    # Broadcast update to all connected clients
    await ws_manager.broadcast({"type": "TIMINGS_UPDATED"})
    
    return timing


# ─── Include Routers ──────────────────────────────────────────
app.include_router(attendance_router)
app.include_router(food_router)
app.include_router(waste_router)
app.include_router(inventory_router)
app.include_router(prediction_router)
app.include_router(analytics_router)
app.include_router(report_router)
app.include_router(student_router)
app.include_router(notification_router)
app.include_router(food_feedback_router)
app.include_router(ml_router)


# ─── Health Check ─────────────────────────────────────────────
@app.get("/api/health", tags=["System"])
def health_check():
    return {"status": "healthy", "version": "1.0.0"}


@app.get("/", tags=["System"])
def root():
    return {"message": "AI Smart Mess Waste Management System API", "docs": "/api/docs"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
