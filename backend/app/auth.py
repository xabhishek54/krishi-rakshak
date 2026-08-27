import os
from datetime import datetime, timedelta
from typing import Optional
import bcrypt
from jose import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.database import get_db
from app import models

# Configuration (provide defaults, check environments)
SECRET_KEY = os.getenv("SECRET_KEY", "krishirakshak_secret_key_sih_hackathon_2026_default")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days token validity

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_farmer(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> models.Farmer:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        phone: str = payload.get("sub")
        if phone is None:
            raise credentials_exception
    except Exception:
        raise credentials_exception
    
    farmer = db.query(models.Farmer).filter(models.Farmer.phone == phone).first()
    if farmer is None:
        raise credentials_exception
    return farmer

def get_current_officer(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> models.AgroOfficer:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate officer credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        phone: str = payload.get("sub")
        role: str = payload.get("role", "farmer")
        if phone is None or role != "officer":
            raise credentials_exception
    except Exception:
        raise credentials_exception
    
    officer = db.query(models.AgroOfficer).filter(models.AgroOfficer.phone == phone).first()
    if officer is None:
        raise credentials_exception
    return officer

