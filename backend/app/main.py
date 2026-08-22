from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List

from app.database import engine, Base, get_db
from app import models, schemas, auth

# Create database tables (mainly for local SQLite development, runs on startup)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="KrishiRakshak API",
    description="Early-warning, risk-intelligence, and intervention system backend API.",
    version="1.0.0"
)

# Enable CORS for frontend accessibility
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict to frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"name": "KrishiRakshak API", "status": "running", "version": "1.0.0"}

# Authentication Routes
@app.post("/api/v1/auth/register", response_model=schemas.FarmerResponse, status_code=status.HTTP_201_CREATED)
def register_farmer(farmer_in: schemas.FarmerCreate, db: Session = Depends(get_db)):
    # Check if phone number is already registered
    db_farmer = db.query(models.Farmer).filter(models.Farmer.phone == farmer_in.phone).first()
    if db_farmer:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phone number already registered"
        )
    
    hashed_pass = auth.get_password_hash(farmer_in.password)
    new_farmer = models.Farmer(
        name=farmer_in.name,
        phone=farmer_in.phone,
        hashed_password=hashed_pass,
        language=farmer_in.language
    )
    db.add(new_farmer)
    db.commit()
    db.refresh(new_farmer)
    return new_farmer

@app.post("/api/v1/auth/login", response_model=schemas.Token)
def login_farmer(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # OAuth2 specifies username field (we map it to phone number)
    farmer = db.query(models.Farmer).filter(models.Farmer.phone == form_data.username).first()
    if not farmer or not auth.verify_password(form_data.password, farmer.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect phone number or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = auth.create_access_token(data={"sub": farmer.phone})
    return {"access_token": access_token, "token_type": "bearer"}

# Farmer Profile Routes
@app.get("/api/v1/farmers/me", response_model=schemas.FarmerResponse)
def get_me(current_farmer: models.Farmer = Depends(auth.get_current_farmer)):
    return current_farmer
