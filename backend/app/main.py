from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
from datetime import date, datetime, timedelta

from app.database import engine, Base, get_db
from app import models, schemas, auth
from app.weather import OpenMeteoProvider
from app.advisory import evaluate_advisories
from app.mandi import seed_mandi_data, get_mandi_comparison

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="KrishiRakshak API",
    description="Early-warning, risk-intelligence, and intervention system backend API.",
    version="1.0.0"
)

@app.on_event("startup")
def startup_event():
    db = next(get_db())
    try:
        seed_mandi_data(db)
    except Exception as e:
        print("Mandi seeding failed:", e)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Weather Provider
weather_provider = OpenMeteoProvider()

# Helper: Crop stage calculation
def get_crop_stage(crop_type: str, sowing_date: date) -> str:
    days = (date.today() - sowing_date).days
    if days < 0:
        return "Sown (Pending)"
    crop = crop_type.lower()
    if "tomato" in crop:
        if days <= 20:
            return "Vegetative"
        elif days <= 45:
            return "Flowering"
        elif days <= 75:
            return "Fruit Development"
        else:
            return "Maturity"
    elif "wheat" in crop:
        if days <= 20:
            return "Crown Root Initiation"
        elif days <= 40:
            return "Tillering"
        elif days <= 60:
            return "Jointing"
        elif days <= 85:
            return "Flowering"
        elif days <= 105:
            return "Milking"
        else:
            return "Maturity"
    elif "onion" in crop:
        if days <= 30:
            return "Seedling Establishment"
        elif days <= 70:
            return "Vegetative Leaf Development"
        elif days <= 100:
            return "Bulb Initiation"
        else:
            return "Bulb Development & Maturity"
    else:
        if days <= 30:
            return "Vegetative"
        elif days <= 60:
            return "Flowering"
        elif days <= 90:
            return "Yield Formation"
        else:
            return "Maturity"

@app.get("/")
def read_root():
    return {"name": "KrishiRakshak API", "status": "running", "version": "1.0.0"}

# Authentication Routes
@app.post("/api/v1/auth/register", response_model=schemas.FarmerResponse, status_code=status.HTTP_201_CREATED)
def register_farmer(farmer_in: schemas.FarmerCreate, db: Session = Depends(get_db)):
    db_farmer = db.query(models.Farmer).filter(models.Farmer.phone == farmer_in.phone).first()
    if db_farmer:
        raise HTTPException(status_code=400, detail="Phone number already registered")
    
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
    farmer = db.query(models.Farmer).filter(models.Farmer.phone == form_data.username).first()
    if not farmer or not auth.verify_password(form_data.password, farmer.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect phone number or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = auth.create_access_token(data={"sub": farmer.phone})
    return {"access_token": access_token, "token_type": "bearer"}

# Farmer Profile & Update
@app.get("/api/v1/farmers/me", response_model=schemas.FarmerResponse)
def get_me(current_farmer: models.Farmer = Depends(auth.get_current_farmer)):
    return current_farmer

@app.put("/api/v1/farmers/me", response_model=schemas.FarmerResponse)
def update_me(farmer_update: schemas.FarmerUpdate, current_farmer: models.Farmer = Depends(auth.get_current_farmer), db: Session = Depends(get_db)):
    if farmer_update.name is not None:
        current_farmer.name = farmer_update.name
    if farmer_update.phone is not None:
        current_farmer.phone = farmer_update.phone
    if farmer_update.language is not None:
        current_farmer.language = farmer_update.language
    if farmer_update.location_id is not None:
        current_farmer.location_id = farmer_update.location_id
    if farmer_update.password is not None:
        current_farmer.hashed_password = auth.get_password_hash(farmer_update.password)
    db.commit()
    db.refresh(current_farmer)
    return current_farmer

# Farm CRUD
@app.post("/api/v1/farmers/me/farms", response_model=schemas.FarmResponse, status_code=status.HTTP_201_CREATED)
def create_farm(farm_in: schemas.FarmCreate, current_farmer: models.Farmer = Depends(auth.get_current_farmer), db: Session = Depends(get_db)):
    new_farm = models.Farm(
        farmer_id=current_farmer.id,
        area=farm_in.area,
        soil_type=farm_in.soil_type,
        irrigation=farm_in.irrigation,
        latitude=farm_in.latitude,
        longitude=farm_in.longitude
    )
    db.add(new_farm)
    db.commit()
    db.refresh(new_farm)
    return new_farm

@app.get("/api/v1/farmers/me/farms", response_model=List[schemas.FarmResponse])
def list_farms(current_farmer: models.Farmer = Depends(auth.get_current_farmer), db: Session = Depends(get_db)):
    return db.query(models.Farm).filter(models.Farm.farmer_id == current_farmer.id).all()

# Crop CRUD
@app.post("/api/v1/farms/{farm_id}/crops", response_model=schemas.CropResponse, status_code=status.HTTP_201_CREATED)
def create_crop(farm_id: int, crop_in: schemas.CropCreate, current_farmer: models.Farmer = Depends(auth.get_current_farmer), db: Session = Depends(get_db)):
    # Verify farm ownership
    farm = db.query(models.Farm).filter(models.Farm.id == farm_id, models.Farm.farmer_id == current_farmer.id).first()
    if not farm:
        raise HTTPException(status_code=403, detail="Not authorized to edit this farm")
    
    stage_derived = get_crop_stage(crop_in.crop_type, crop_in.sowing_date)
    new_crop = models.Crop(
        farm_id=farm_id,
        crop_type=crop_in.crop_type,
        variety=crop_in.variety,
        sowing_date=crop_in.sowing_date,
        stage=stage_derived,
        expected_harvest_date=crop_in.expected_harvest_date,
        image_url=crop_in.image_url
    )
    db.add(new_crop)
    db.commit()
    db.refresh(new_crop)
    return new_crop

@app.get("/api/v1/farms/{farm_id}/crops", response_model=List[schemas.CropResponse])
def list_crops(farm_id: int, current_farmer: models.Farmer = Depends(auth.get_current_farmer), db: Session = Depends(get_db)):
    farm = db.query(models.Farm).filter(models.Farm.id == farm_id, models.Farm.farmer_id == current_farmer.id).first()
    if not farm:
        raise HTTPException(status_code=403, detail="Not authorized to query this farm")
    
    crops = db.query(models.Crop).filter(models.Crop.farm_id == farm_id).all()
    # Recalculate dynamic stages on fetch
    for crop in crops:
        crop.stage = get_crop_stage(crop.crop_type, crop.sowing_date)
    return crops

# Weather router
@app.post("/api/v1/weather/{location_id}/refresh")
async def refresh_weather(location_id: str, current_farmer: models.Farmer = Depends(auth.get_current_farmer), db: Session = Depends(get_db)):
    # Find farm coordinate to query provider
    farm = db.query(models.Farm).filter(models.Farm.farmer_id == current_farmer.id).first()
    if not farm or farm.latitude is None or farm.longitude is None:
        raise HTTPException(status_code=400, detail="Farmer has no farm with GPS coordinates configured")
    
    weather_data = await weather_provider.fetch_weather(farm.latitude, farm.longitude)
    if not weather_data:
        raise HTTPException(status_code=502, detail="Failed to retrieve weather from Open-Meteo")
    
    # Save/Update current observation
    today_date = date.today()
    obs = db.query(models.WeatherObservation).filter(
        models.WeatherObservation.location_id == location_id,
        models.WeatherObservation.date == today_date
    ).first()
    
    if obs:
        obs.rainfall = weather_data["observation"]["rainfall"]
        obs.temperature = weather_data["observation"]["temperature"]
        obs.humidity = weather_data["observation"]["humidity"]
    else:
        obs = models.WeatherObservation(
            location_id=location_id,
            date=today_date,
            rainfall=weather_data["observation"]["rainfall"],
            temperature=weather_data["observation"]["temperature"],
            humidity=weather_data["observation"]["humidity"]
        )
        db.add(obs)
        
    # Save/Update forecasts
    for fc in weather_data["forecast"]:
        forecast_row = db.query(models.WeatherForecast).filter(
            models.WeatherForecast.location_id == location_id,
            models.WeatherForecast.date == fc["date"]
        ).first()
        
        if forecast_row:
            forecast_row.rainfall_forecast = fc["rainfall_forecast"]
            forecast_row.temperature = fc["temperature"]
            forecast_row.rain_probability = fc["rain_probability"]
        else:
            forecast_row = models.WeatherForecast(
                location_id=location_id,
                date=fc["date"],
                rainfall_forecast=fc["rainfall_forecast"],
                temperature=fc["temperature"],
                rain_probability=fc["rain_probability"]
            )
            db.add(forecast_row)
            
    db.commit()
    return {"status": "success", "message": "Weather cache refreshed successfully"}

@app.get("/api/v1/weather/{location_id}")
async def get_weather(location_id: str, db: Session = Depends(get_db)):
    # Retrieve cached values from DB
    today_date = date.today()
    obs = db.query(models.WeatherObservation).filter(
        models.WeatherObservation.location_id == location_id,
        models.WeatherObservation.date == today_date
    ).first()
    
    forecasts = db.query(models.WeatherForecast).filter(
        models.WeatherForecast.location_id == location_id,
        models.WeatherForecast.date >= today_date
    ).order_by(models.WeatherForecast.date.asc()).all()
    
    return {
        "location_id": location_id,
        "observation": obs,
        "forecasts": forecasts,
        "generated_at": datetime.utcnow()
    }

@app.get("/api/v1/advisories", response_model=List[schemas.AdvisoryResponse])
def get_advisories(current_farmer: models.Farmer = Depends(auth.get_current_farmer), db: Session = Depends(get_db)):
    evaluate_advisories(db, current_farmer)
    farm_ids = [f.id for f in db.query(models.Farm).filter(models.Farm.farmer_id == current_farmer.id).all()]
    return db.query(models.Advisory).filter(models.Advisory.farm_id.in_(farm_ids)).all()

@app.get("/api/v1/alerts", response_model=List[schemas.AlertResponse])
def get_alerts(current_farmer: models.Farmer = Depends(auth.get_current_farmer), db: Session = Depends(get_db)):
    evaluate_advisories(db, current_farmer)
    return db.query(models.Alert).filter(models.Alert.farmer_id == current_farmer.id).all()

@app.get("/api/v1/mandis/compare", response_model=List[schemas.MandiCompareResponse])
def compare_mandis(
    crop: str = "tomato",
    current_farmer: models.Farmer = Depends(auth.get_current_farmer),
    db: Session = Depends(get_db)
):
    farm = db.query(models.Farm).filter(models.Farm.farmer_id == current_farmer.id).first()
    if not farm:
        lat, lon = 20.08, 74.11
    else:
        lat, lon = farm.latitude, farm.longitude
        
    return get_mandi_comparison(db, crop, lat, lon)
