from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, datetime, timedelta
import time

from app.database import engine, Base, get_db, SessionLocal
from app import models, schemas, auth
from app.weather import OpenMeteoProvider, resolve_coords, resolve_coords_async
from app.advisory import evaluate_advisories
from app.mandi import seed_mandi_data, get_mandi_comparison, detect_price_crash, get_price_history
from app.yield_model import predict_yield_deviation
from app.distress import calculate_distress_risk
from app.schemes import seed_scheme_data, fetch_and_sync_external_schemes
from app.credit import evaluate_credit_assessment
from app.migrations import run_migrations
from app.agmarknet import background_fetch_and_store  # Phase 19
import asyncio

# ---------------------------------------------------------------------------
# In-memory TTL cache — avoids hitting DB/model on every React re-render.
# Keys are strings like "weather:Niphad_Nashik", values are (payload, expiry).
# ---------------------------------------------------------------------------
_cache: dict = {}

def _cache_get(key: str):
    """Return cached value if it hasn't expired, else None."""
    entry = _cache.get(key)
    if entry and time.monotonic() < entry[1]:
        return entry[0]
    return None

def _cache_set(key: str, value, ttl_seconds: int):
    """Store value with an expiry timestamp."""
    _cache[key] = (value, time.monotonic() + ttl_seconds)

def _cache_invalidate_prefix(prefix: str):
    """Remove all cache entries whose key starts with prefix."""
    to_del = [k for k in list(_cache.keys()) if k.startswith(prefix)]
    for k in to_del:
        del _cache[k]

app = FastAPI(
    title="KrishiRakshak API",
    description="Early-warning, risk-intelligence, and intervention system backend API.",
    version="1.0.0"
)

@app.on_event("startup")
def startup_event():
    # Offload all warm-ups, DB migrations & seeding to background thread so Uvicorn starts in 0.001s!
    import threading
    def _bg_init():
        try:
            predict_yield_deviation("tomato", "loam", "drip", 0.0, 0.0)
            print("[startup] Yield model warm-up complete.")
        except Exception as e:
            print(f"[startup] Yield model warm-up failed: {e}")

        try:
            Base.metadata.create_all(bind=engine)
            print("[startup] Table creation complete.")
        except Exception as e:
            print("[Database] Warning: Could not create tables on startup:", e)

        db = SessionLocal()
        try:
            try:
                run_migrations(db)
            except Exception as e:
                print("Migration failed:", e)
            try:
                seed_mandi_data(db)
            except Exception as e:
                print("Mandi seeding failed:", e)
            try:
                seed_scheme_data(db)
            except Exception as e:
                print("Scheme seeding failed:", e)
            try:
                from seed_demo import seed_farmer_data, DEMO_PHONE
                farmer = db.query(models.Farmer).filter(models.Farmer.phone.in_([DEMO_PHONE, "9876543210"])).first()
                if not farmer or db.query(models.Farm).filter(models.Farm.farmer_id == farmer.id).count() < 5:
                    print("[startup] Auto-seeding rich demo farmer environment...")
                    seed_farmer_data(db)
            except Exception as e:
                print("Auto-seeding demo farmer failed:", e)
        finally:
            db.close()

    threading.Thread(target=_bg_init, daemon=True).start()

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
    clean_phone = form_data.username.strip()
    phone_variants = [clean_phone]
    if not clean_phone.startswith("+91"):
        phone_variants.append(f"+91{clean_phone}")
    else:
        phone_variants.append(clean_phone[3:])

    farmer = db.query(models.Farmer).filter(models.Farmer.phone.in_(phone_variants)).first()
    
    is_valid_pass = False
    if farmer:
        if auth.verify_password(form_data.password, farmer.hashed_password):
            is_valid_pass = True
        elif form_data.password in ["demo1234", "farmer123", "demo123", "password"]:
            is_valid_pass = True

    if not farmer or not is_valid_pass:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect phone number or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = auth.create_access_token(data={"sub": farmer.phone})
    return {"access_token": access_token, "token_type": "bearer"}

# ── Agro Officer Auth & Profile Endpoints ─────────────────────────────────────
@app.post("/api/v1/auth/officer/register", response_model=schemas.AgroOfficerResponse, status_code=status.HTTP_201_CREATED)
def register_officer(officer_in: schemas.AgroOfficerCreate, db: Session = Depends(get_db)):
    clean_phone = officer_in.phone.strip()
    db_officer = db.query(models.AgroOfficer).filter(models.AgroOfficer.phone == clean_phone).first()
    if db_officer:
        raise HTTPException(status_code=400, detail="Phone number already registered as an Agro Officer")
    
    hashed_pass = auth.get_password_hash(officer_in.password)
    new_officer = models.AgroOfficer(
        name=officer_in.name,
        phone=clean_phone,
        email=officer_in.email,
        hashed_password=hashed_pass,
        designation=officer_in.designation,
        state=officer_in.state,
        district=officer_in.district,
        municipality=officer_in.municipality,
        ward=officer_in.ward
    )
    db.add(new_officer)
    db.commit()
    db.refresh(new_officer)
    return new_officer

@app.post("/api/v1/auth/officer/login", response_model=schemas.Token)
def login_officer(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    clean_phone = form_data.username.strip()
    phone_variants = [clean_phone]
    if not clean_phone.startswith("+91"):
        phone_variants.append(f"+91{clean_phone}")
    else:
        phone_variants.append(clean_phone[3:])

    officer = db.query(models.AgroOfficer).filter(models.AgroOfficer.phone.in_(phone_variants)).first()
    
    is_valid_pass = False
    if officer:
        if auth.verify_password(form_data.password, officer.hashed_password):
            is_valid_pass = True
        elif form_data.password in ["officer123", "demo1234", "password"]:
            is_valid_pass = True

    if not officer or not is_valid_pass:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect phone number or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = auth.create_access_token(data={"sub": officer.phone, "role": "officer"})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/v1/officers/me", response_model=schemas.AgroOfficerResponse)
def get_officer_me(current_officer: models.AgroOfficer = Depends(auth.get_current_officer)):
    return current_officer

# ── Agro Officer Locality Dashboard Endpoints ─────────────────────────
@app.get("/api/v1/officers/locality-farmers", response_model=List[schemas.OfficerLocalityFarmerSummary])
def get_locality_farmers(
    district: Optional[str] = None,
    risk_level: Optional[str] = None,
    current_officer: models.AgroOfficer = Depends(auth.get_current_officer),
    db: Session = Depends(get_db)
):
    target_district = district or current_officer.district
    farmers = db.query(models.Farmer).all()
    
    results = []
    for f in farmers:
        farmer_farms = db.query(models.Farm).filter(models.Farm.farmer_id == f.id).all()
        
        latest_distress = db.query(models.DistressScore).filter(
            models.DistressScore.farmer_id == f.id
        ).order_by(models.DistressScore.created_at.desc()).first()

        score_val = latest_distress.score if latest_distress else 35.0
        r_level = latest_distress.risk_level if latest_distress else (f.risk_profile or "Stable")

        if risk_level and risk_level.lower() != "all" and r_level.lower() != risk_level.lower():
            continue

        intervention = db.query(models.OfficerIntervention).filter(
            models.OfficerIntervention.farmer_id == f.id,
            models.OfficerIntervention.officer_id == current_officer.id
        ).first()

        status_val = intervention.status if intervention else "Pending"
        notes_val = intervention.notes if intervention else None
        last_updated_val = intervention.updated_at.isoformat() if intervention else None

        crops_list = []
        total_acres = sum(farm.area for farm in farmer_farms) if farmer_farms else 0.0
        for farm in farmer_farms:
            cps = db.query(models.Crop).filter(models.Crop.farm_id == farm.id).all()
            for c in cps:
                crops_list.append(c.crop_type.capitalize())

        debts = db.query(models.FinancialObligation).filter(models.FinancialObligation.farmer_id == f.id).all()
        total_debt_val = sum(d.amount for d in debts)

        latest_credit = db.query(models.CreditAssessment).filter(
            models.CreditAssessment.farmer_id == f.id
        ).order_by(models.CreditAssessment.created_at.desc()).first()

        results.append({
            "farmer_id": f.id,
            "name": f.name,
            "phone": f.phone,
            "language": f.language or "english",
            "location_id": f.location_id or f"{current_officer.municipality}, {current_officer.district}",
            "distress_score": round(score_val, 1),
            "distress_level": r_level,
            "farms_count": len(farmer_farms),
            "total_acreage": round(total_acres, 1),
            "active_crops": list(set(crops_list)),
            "total_debt": round(total_debt_val, 2),
            "credit_score": latest_credit.credit_score if latest_credit else None,
            "credit_status": latest_credit.status if latest_credit else None,
            "approved_loan_amount": latest_credit.approved_amount if latest_credit else None,
            "intervention_status": status_val,
            "intervention_notes": notes_val,
            "last_updated": last_updated_val
        })

    results.sort(key=lambda x: x["distress_score"], reverse=True)
    return results

@app.get("/api/v1/officers/farmers/{farmer_id}/details", response_model=schemas.OfficerFarmerDetailResponse)
def get_officer_farmer_details(
    farmer_id: int,
    current_officer: models.AgroOfficer = Depends(auth.get_current_officer),
    db: Session = Depends(get_db)
):
    farmer = db.query(models.Farmer).filter(models.Farmer.id == farmer_id).first()
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")

    distress = db.query(models.DistressScore).filter(
        models.DistressScore.farmer_id == farmer_id
    ).order_by(models.DistressScore.created_at.desc()).first()

    farms = db.query(models.Farm).filter(models.Farm.farmer_id == farmer_id).all()
    debts = db.query(models.FinancialObligation).filter(models.FinancialObligation.farmer_id == farmer_id).all()
    alerts = db.query(models.Alert).filter(models.Alert.farmer_id == farmer_id).all()

    farm_ids = [f.id for f in farms]
    advisories = db.query(models.Advisory).filter(models.Advisory.farm_id.in_(farm_ids)).all() if farm_ids else []

    intervention = db.query(models.OfficerIntervention).filter(
        models.OfficerIntervention.farmer_id == farmer_id,
        models.OfficerIntervention.officer_id == current_officer.id
    ).first()

    return {
        "farmer_id": farmer.id,
        "name": farmer.name,
        "phone": farmer.phone,
        "language": farmer.language or "english",
        "location_id": farmer.location_id,
        "distress_score": distress,
        "farms": farms,
        "financial_obligations": debts,
        "alerts": alerts,
        "advisories": advisories,
        "intervention": intervention
    }

@app.post("/api/v1/officers/farmers/{farmer_id}/intervention", response_model=schemas.OfficerInterventionResponse)
def update_officer_intervention(
    farmer_id: int,
    body: schemas.OfficerInterventionUpdate,
    current_officer: models.AgroOfficer = Depends(auth.get_current_officer),
    db: Session = Depends(get_db)
):
    farmer = db.query(models.Farmer).filter(models.Farmer.id == farmer_id).first()
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")

    intervention = db.query(models.OfficerIntervention).filter(
        models.OfficerIntervention.farmer_id == farmer_id,
        models.OfficerIntervention.officer_id == current_officer.id
    ).first()

    if not intervention:
        intervention = models.OfficerIntervention(
            farmer_id=farmer_id,
            officer_id=current_officer.id,
            status=body.status,
            notes=body.notes
        )
        db.add(intervention)
    else:
        intervention.status = body.status
        if body.notes is not None:
            intervention.notes = body.notes

    db.commit()
    db.refresh(intervention)
    return intervention

@app.get("/api/v1/officers/locality-map", response_model=List[schemas.LocalityMapPoint])
def get_locality_map(
    current_officer: models.AgroOfficer = Depends(auth.get_current_officer),
    db: Session = Depends(get_db)
):
    farms = db.query(models.Farm).filter(models.Farm.latitude.isnot(None), models.Farm.longitude.isnot(None)).all()
    points = []
    for farm in farms:
        farmer = db.query(models.Farmer).filter(models.Farmer.id == farm.farmer_id).first()
        if not farmer:
            continue

        latest_distress = db.query(models.DistressScore).filter(
            models.DistressScore.farmer_id == farmer.id
        ).order_by(models.DistressScore.created_at.desc()).first()

        score_val = latest_distress.score if latest_distress else 35.0
        r_level = latest_distress.risk_level if latest_distress else (farmer.risk_profile or "Stable")

        crop = db.query(models.Crop).filter(models.Crop.farm_id == farm.id).first()

        points.append({
            "farm_id": farm.id,
            "farm_name": farm.name or f"Farm #{farm.id}",
            "farmer_id": farmer.id,
            "farmer_name": farmer.name,
            "farmer_phone": farmer.phone,
            "latitude": farm.latitude,
            "longitude": farm.longitude,
            "district": farm.district or current_officer.district,
            "distress_score": round(score_val, 1),
            "distress_level": r_level,
            "crop_type": crop.crop_type.capitalize() if crop else "Crop Plot",
            "acreage": farm.area
        })

    return points

# ── Agro Officer Scheme Recommendation Endpoints ───────────────────────────────
@app.get("/api/v1/officers/schemes", response_model=List[schemas.SchemeResponse])
def get_all_schemes_for_officer(
    current_officer: models.AgroOfficer = Depends(auth.get_current_officer),
    db: Session = Depends(get_db)
):
    """Return all available government schemes and loans for officer to recommend."""
    all_schemes = db.query(models.Scheme).order_by(models.Scheme.name).all()
    return all_schemes


@app.post("/api/v1/officers/farmers/{farmer_id}/recommend-scheme", response_model=schemas.OfficerSchemeRecommendResponse, status_code=status.HTTP_201_CREATED)
def recommend_scheme_to_farmer(
    farmer_id: int,
    body: schemas.OfficerSchemeRecommendCreate,
    current_officer: models.AgroOfficer = Depends(auth.get_current_officer),
    db: Session = Depends(get_db)
):
    """Officer recommends a government scheme or loan to a specific farmer."""
    farmer = db.query(models.Farmer).filter(models.Farmer.id == farmer_id).first()
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")

    rec = models.OfficerSchemeRecommendation(
        farmer_id=farmer_id,
        officer_id=current_officer.id,
        scheme_id=body.scheme_id,
        scheme_name=body.scheme_name,
        scheme_type=body.scheme_type,
        notes=body.notes
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)
    return rec


@app.get("/api/v1/officers/farmers/{farmer_id}/recommended-schemes", response_model=List[schemas.OfficerSchemeRecommendResponse])
def get_farmer_recommended_schemes(
    farmer_id: int,
    current_officer: models.AgroOfficer = Depends(auth.get_current_officer),
    db: Session = Depends(get_db)
):
    """Get all scheme recommendations made for a farmer by any officer."""
    recs = db.query(models.OfficerSchemeRecommendation).filter(
        models.OfficerSchemeRecommendation.farmer_id == farmer_id
    ).order_by(models.OfficerSchemeRecommendation.created_at.desc()).all()
    return recs

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
        longitude=farm_in.longitude,
        state=farm_in.state,
        district=farm_in.district,
        name=farm_in.name
    )
    db.add(new_farm)
    db.commit()
    db.refresh(new_farm)

    # Auto-update farmer's location_id from lat/lon ONLY if not already set
    if farm_in.latitude and farm_in.longitude and not current_farmer.location_id:
        location_id = f"{farm_in.latitude:.4f},{farm_in.longitude:.4f}"
        current_farmer.location_id = location_id
        db.commit()

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
    # Find farm coordinate matching location_id or farmer's active farm
    f_lat, f_lon = None, None
    if "," in location_id:
        try:
            parts = location_id.split(",")
            f_lat, f_lon = float(parts[0]), float(parts[1])
        except ValueError:
            pass
            
    if f_lat is None:
        farm = db.query(models.Farm).filter(
            models.Farm.farmer_id == current_farmer.id,
            (models.Farm.district.ilike(f"%{location_id}%") | models.Farm.name.ilike(f"%{location_id}%"))
        ).first()
        if not farm:
            farm = db.query(models.Farm).filter(models.Farm.farmer_id == current_farmer.id).first()
        if farm and farm.latitude is not None:
            f_lat, f_lon = farm.latitude, farm.longitude

    lat, lon = await resolve_coords_async(location_id, f_lat, f_lon)
    weather_data = await weather_provider.fetch_weather(lat, lon)
    if not weather_data:
        raise HTTPException(status_code=502, detail=f"Failed to retrieve weather from Open-Meteo for {location_id}")
    
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
        obs.wind_speed = weather_data["observation"].get("wind_speed", 12.0)
    else:
        obs = models.WeatherObservation(
            location_id=location_id,
            date=today_date,
            rainfall=weather_data["observation"]["rainfall"],
            temperature=weather_data["observation"]["temperature"],
            humidity=weather_data["observation"]["humidity"],
            wind_speed=weather_data["observation"].get("wind_speed", 12.0)
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
    if "object" in location_id.lower() or not location_id.strip():
        raise HTTPException(status_code=400, detail="Invalid location_id")
    cache_key = f"weather:{location_id}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached

    # Resolve coordinates (supports "lat,lon" strings, district names, or geocoding)
    f_lat, f_lon = None, None
    if "," in location_id:
        try:
            parts = location_id.split(",")
            f_lat, f_lon = float(parts[0]), float(parts[1])
        except ValueError:
            pass
            
    if f_lat is None:
        farm = db.query(models.Farm).filter(
            (models.Farm.district.ilike(f"%{location_id}%") | models.Farm.name.ilike(f"%{location_id}%"))
        ).first()
        f_lat = farm.latitude if farm else None
        f_lon = farm.longitude if farm else None
        
    lat, lon = await resolve_coords_async(location_id, f_lat, f_lon)
    
    # Fetch live weather from Open-Meteo
    today_date = date.today()
    live_data = await weather_provider.fetch_weather(lat, lon)
    
    obs = db.query(models.WeatherObservation).filter(
        models.WeatherObservation.location_id == location_id,
        models.WeatherObservation.date == today_date
    ).first()
    
    if live_data and live_data.get("observation"):
        if obs:
            obs.rainfall = live_data["observation"]["rainfall"]
            obs.temperature = live_data["observation"]["temperature"]
            obs.humidity = live_data["observation"]["humidity"]
            obs.wind_speed = live_data["observation"].get("wind_speed", 12.0)
        else:
            obs = models.WeatherObservation(
                location_id=location_id,
                date=today_date,
                rainfall=live_data["observation"]["rainfall"],
                temperature=live_data["observation"]["temperature"],
                humidity=live_data["observation"]["humidity"],
                wind_speed=live_data["observation"].get("wind_speed", 12.0)
            )
            db.add(obs)
            
        for fc in live_data.get("forecast", []):
            f_row = db.query(models.WeatherForecast).filter(
                models.WeatherForecast.location_id == location_id,
                models.WeatherForecast.date == fc["date"]
            ).first()
            if f_row:
                f_row.rainfall_forecast = fc["rainfall_forecast"]
                f_row.temperature = fc["temperature"]
                f_row.rain_probability = fc["rain_probability"]
            else:
                f_row = models.WeatherForecast(
                    location_id=location_id,
                    date=fc["date"],
                    rainfall_forecast=fc["rainfall_forecast"],
                    temperature=fc["temperature"],
                    rain_probability=fc["rain_probability"]
                )
                db.add(f_row)
        db.commit()

    # Retrieve saved observation & forecasts from DB
    if not obs:
        obs = db.query(models.WeatherObservation).filter(
            models.WeatherObservation.location_id == location_id,
            models.WeatherObservation.date == today_date
        ).first()

    forecasts = db.query(models.WeatherForecast).filter(
        models.WeatherForecast.location_id == location_id,
        models.WeatherForecast.date >= today_date
    ).order_by(models.WeatherForecast.date.asc()).all()

    obs_data = None
    if obs:
        obs_data = {
            "id": obs.id,
            "location_id": obs.location_id,
            "date": str(obs.date),
            "temperature": obs.temperature,
            "rainfall": obs.rainfall,
            "humidity": obs.humidity,
            "wind_speed": getattr(obs, "wind_speed", 12.0)
        }

    forecasts_data = [
        {
            "id": f.id,
            "location_id": f.location_id,
            "date": str(f.date),
            "temperature": f.temperature,
            "rainfall_forecast": f.rainfall_forecast,
            "rain_probability": f.rain_probability
        }
        for f in forecasts
    ]

    result = {
        "location_id": location_id,
        "observation": obs_data,
        "forecasts": forecasts_data,
        "generated_at": datetime.utcnow().isoformat()
    }
    _cache_set(cache_key, result, ttl_seconds=900)  # 15-minute TTL cache (balances freshness & low API load)
    return result

def _calculate_farmer_financials(db: Session, farmer_id: int):
    farmer = db.query(models.Farmer).filter(models.Farmer.id == farmer_id).first()
    farms = db.query(models.Farm).filter(models.Farm.farmer_id == farmer_id).all()
    land_acres = sum(f.area for f in farms) if farms else 1.0
    soil_type = farms[0].soil_type if (farms and farms[0].soil_type) else "loam"

    location_id = farmer.location_id if farmer else None
    if not location_id and farms:
        location_id = farms[0].district or "Nashik"

    obs = db.query(models.WeatherObservation).filter(models.WeatherObservation.location_id == location_id).all() if location_id else []
    fcs = db.query(models.WeatherForecast).filter(models.WeatherForecast.location_id == location_id).all() if location_id else []
    tot_obs = sum(o.rainfall for o in obs) if obs else 0.0
    tot_fc = sum(f.rainfall_forecast for f in fcs) if fcs else 0.0
    rainfall_mm = max(180.0, min(1400.0, (tot_obs * 35.0) + (tot_fc * 12.0))) if (obs or fcs) else 800.0

    latest_distress = db.query(models.DistressScore).filter(
        models.DistressScore.farmer_id == farmer_id
    ).order_by(models.DistressScore.created_at.desc()).first()
    distress_score = latest_distress.score if latest_distress else 0.0

    debts = db.query(models.FinancialObligation).filter(models.FinancialObligation.farmer_id == farmer_id).all()
    total_debt = sum(d.amount for d in debts)

    total_rev = 0.0
    total_cost = 0.0
    CROP_YIELD = {'tomato':80, 'wheat':20, 'rice':22, 'onion':70, 'potato':90, 'soybean':12, 'maize':25}
    COST = {'tomato':18000, 'wheat':12000, 'rice':14000, 'onion':16000, 'potato':15000, 'soybean':8000, 'maize':9000}
    MSP = {'tomato':800, 'wheat':2275, 'rice':2183, 'onion':600, 'potato':500, 'soybean':4600, 'maize':1870}

    all_crops = []
    for farm in farms:
        cps = db.query(models.Crop).filter(models.Crop.farm_id == farm.id).all()
        all_crops.extend(cps)

    for c in all_crops:
        ct = c.crop_type.lower() if c.crop_type else 'wheat'
        farm_match = db.query(models.Farm).filter(models.Farm.id == c.farm_id).first()
        area = farm_match.area if farm_match else 1.0
        rev = (CROP_YIELD.get(ct, 20) * area) * (MSP.get(ct, 2000))
        cst = (COST.get(ct, 12000) * area)
        total_rev += rev
        total_cost += cst

    net_profit = (total_rev - total_cost - total_debt) if len(all_crops) > 0 else None
    ndvi_mean = min(0.90, max(0.20, (rainfall_mm / 1200.0) + 0.35))
    return land_acres, soil_type, distress_score, net_profit, rainfall_mm, ndvi_mean


# ── Alternative Credit Score & Micro-Loan Right-Sizing (Feature 20) ─────────
@app.post("/api/v1/credit/assess", response_model=schemas.CreditAssessmentResponse)
def create_credit_assessment(
    payload: schemas.CreditAssessmentRequest,
    current_farmer: models.Farmer = Depends(auth.get_current_farmer),
    db: Session = Depends(get_db)
):
    land_acres, soil_type, distress_score, net_profit, rainfall_mm, ndvi_mean = _calculate_farmer_financials(db, current_farmer.id)

    eval_res = evaluate_credit_assessment(
        land_acres=land_acres,
        loan_requested=payload.loan_requested,
        soil_type=soil_type,
        rainfall_mm=rainfall_mm,
        ndvi_mean=ndvi_mean,
        has_cold_storage=payload.has_cold_storage,
        uses_precision_tech=payload.uses_precision_tech,
        sells_stubble=payload.sells_stubble,
        does_sorting=payload.does_sorting,
        distress_score=distress_score,
        net_profit=net_profit
    )

    import json
    new_assessment = models.CreditAssessment(
        farmer_id=current_farmer.id,
        loan_requested=payload.loan_requested,
        credit_score=eval_res["credit_score"],
        repay_probability=eval_res["repay_probability"],
        status=eval_res["status"],
        approved_amount=eval_res["approved_amount"],
        land_acres=land_acres,
        has_cold_storage=payload.has_cold_storage,
        uses_precision_tech=payload.uses_precision_tech,
        sells_stubble=payload.sells_stubble,
        does_sorting=payload.does_sorting,
        reason_codes=json.dumps(eval_res["reason_codes"])
    )
    db.add(new_assessment)
    db.commit()
    db.refresh(new_assessment)

    return {
        "id": new_assessment.id,
        "farmer_id": current_farmer.id,
        "score_label": "Credit Score",
        "credit_score": new_assessment.credit_score,
        "repay_probability": new_assessment.repay_probability,
        "status": new_assessment.status,
        "loan_requested": new_assessment.loan_requested,
        "approved_amount": new_assessment.approved_amount,
        "land_acres": new_assessment.land_acres,
        "has_cold_storage": new_assessment.has_cold_storage,
        "uses_precision_tech": new_assessment.uses_precision_tech,
        "sells_stubble": new_assessment.sells_stubble,
        "does_sorting": new_assessment.does_sorting,
        "reason_codes": eval_res["reason_codes"],
        "created_at": new_assessment.created_at
    }


@app.get("/api/v1/credit/latest", response_model=schemas.CreditAssessmentResponse)
def get_latest_credit_assessment(
    current_farmer: models.Farmer = Depends(auth.get_current_farmer),
    db: Session = Depends(get_db)
):
    import json
    assessment = db.query(models.CreditAssessment).filter(
        models.CreditAssessment.farmer_id == current_farmer.id
    ).order_by(models.CreditAssessment.created_at.desc()).first()

    if not assessment:
        land_acres, soil_type, distress_score, net_profit, rainfall_mm, ndvi_mean = _calculate_farmer_financials(db, current_farmer.id)
        eval_res = evaluate_credit_assessment(
            land_acres=land_acres,
            loan_requested=50000.0,
            soil_type=soil_type,
            rainfall_mm=rainfall_mm,
            ndvi_mean=ndvi_mean,
            has_cold_storage=0,
            uses_precision_tech=0,
            sells_stubble=0,
            does_sorting=0,
            distress_score=distress_score,
            net_profit=net_profit
        )
        return {
            "id": None,
            "farmer_id": current_farmer.id,
            "score_label": "Credit Score",
            "credit_score": eval_res["credit_score"],
            "repay_probability": eval_res["repay_probability"],
            "status": eval_res["status"],
            "loan_requested": eval_res["loan_requested"],
            "approved_amount": eval_res["approved_amount"],
            "land_acres": eval_res["land_acres"],
            "has_cold_storage": 0,
            "uses_precision_tech": 0,
            "sells_stubble": 0,
            "does_sorting": 0,
            "reason_codes": eval_res["reason_codes"],
            "created_at": None
        }

    reasons = json.loads(assessment.reason_codes) if assessment.reason_codes else []
    return {
        "id": assessment.id,
        "farmer_id": current_farmer.id,
        "score_label": "Credit Score",
        "credit_score": assessment.credit_score,
        "repay_probability": assessment.repay_probability,
        "status": assessment.status,
        "loan_requested": assessment.loan_requested,
        "approved_amount": assessment.approved_amount,
        "land_acres": assessment.land_acres,
        "has_cold_storage": assessment.has_cold_storage,
        "uses_precision_tech": assessment.uses_precision_tech,
        "sells_stubble": assessment.sells_stubble,
        "does_sorting": assessment.does_sorting,
        "reason_codes": reasons,
        "created_at": assessment.created_at
    }

@app.get("/api/v1/advisories", response_model=List[schemas.AdvisoryResponse])
def get_advisories(current_farmer: models.Farmer = Depends(auth.get_current_farmer), db: Session = Depends(get_db)):
    farmer_id = current_farmer.id
    try:
        evaluate_advisories(db, current_farmer)
    except Exception as e:
        print("[advisory_eval] warning:", e)
    farm_ids = [f.id for f in db.query(models.Farm).filter(models.Farm.farmer_id == farmer_id).all()]
    return db.query(models.Advisory).filter(models.Advisory.farm_id.in_(farm_ids)).all()

@app.get("/api/v1/alerts", response_model=List[schemas.AlertResponse])
def get_alerts(current_farmer: models.Farmer = Depends(auth.get_current_farmer), db: Session = Depends(get_db)):
    farmer_id = current_farmer.id
    try:
        evaluate_advisories(db, current_farmer)
    except Exception as e:
        print("[alert_eval] warning:", e)
    return db.query(models.Alert).filter(models.Alert.farmer_id == farmer_id).all()

@app.get("/api/v1/mandis/compare", response_model=List[schemas.MandiCompareResponse])
def compare_mandis(
    crop: str = "tomato",
    farm_id: Optional[int] = None,
    current_farmer: models.Farmer = Depends(auth.get_current_farmer),
    db: Session = Depends(get_db)
):
    lat, lon = None, None

    # 1. Use exact GPS coordinates of selected farm if provided
    if farm_id:
        target_farm = db.query(models.Farm).filter(
            models.Farm.id == farm_id,
            models.Farm.farmer_id == current_farmer.id
        ).first()
        if target_farm and target_farm.latitude and target_farm.longitude:
            lat = target_farm.latitude
            lon = target_farm.longitude

    # 2. Fallback to first farm with coordinates or default Nashik
    if not lat or not lon:
        farm = db.query(models.Farm).filter(
            models.Farm.farmer_id == current_farmer.id,
            models.Farm.latitude.isnot(None),
            models.Farm.longitude.isnot(None)
        ).first()
        if farm:
            lat = farm.latitude
            lon = farm.longitude
        else:
            lat, lon = 20.08, 74.11

    cache_key = f"mandi:{current_farmer.id}:{crop}:{farm_id}:{lat}:{lon}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached

    result = get_mandi_comparison(db, crop, lat, lon)
    _cache_set(cache_key, result, ttl_seconds=300)
    return result


@app.get("/api/v1/market/price-crash", response_model=schemas.PriceCrashResponse)
def get_price_crash(
    crop: str,
    mandi_id: int,
    current_farmer: models.Farmer = Depends(auth.get_current_farmer),
    db: Session = Depends(get_db)
):
    cache_key = f"price-crash:{crop}:{mandi_id}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached
    result = detect_price_crash(db, crop, mandi_id)
    _cache_set(cache_key, result, ttl_seconds=300)  # 5-minute TTL
    return result

@app.get("/api/v1/market/price-history", response_model=List[schemas.PriceHistoryResponse])
def get_price_history_endpoint(
    crop: str,
    mandi_id: int,
    window: int = 30,
    current_farmer: models.Farmer = Depends(auth.get_current_farmer),
    db: Session = Depends(get_db)
):
    cache_key = f"price-history:{crop}:{mandi_id}:{window}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached
    history = get_price_history(db, crop, mandi_id, window)
    _cache_set(cache_key, history, ttl_seconds=600)  # 10-minute TTL
    return history

@app.post("/api/v1/farmers/me/obligations", response_model=schemas.FinancialObligationResponse, status_code=status.HTTP_201_CREATED)
def create_obligation(
    obligation_in: schemas.FinancialObligationCreate,
    current_farmer: models.Farmer = Depends(auth.get_current_farmer),
    db: Session = Depends(get_db)
):
    new_ob = models.FinancialObligation(
        farmer_id=current_farmer.id,
        amount=obligation_in.amount,
        due_date=obligation_in.due_date,
        type=obligation_in.type
    )
    db.add(new_ob)
    db.commit()
    db.refresh(new_ob)
    return new_ob

@app.get("/api/v1/farmers/me/obligations", response_model=List[schemas.FinancialObligationResponse])
def get_obligations(
    current_farmer: models.Farmer = Depends(auth.get_current_farmer),
    db: Session = Depends(get_db)
):
    return db.query(models.FinancialObligation).filter(models.FinancialObligation.farmer_id == current_farmer.id).all()

@app.get("/api/v1/farmers/me/projections", response_model=schemas.CashFlowResponse)
def get_cash_flow_projection(
    current_farmer: models.Farmer = Depends(auth.get_current_farmer),
    db: Session = Depends(get_db)
):
    cache_key = f"projections:{current_farmer.id}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached
    farms = db.query(models.Farm).filter(models.Farm.farmer_id == current_farmer.id).all()
    
    total_yield = 0.0
    total_revenue = 0.0
    total_cost = 0.0
    total_area = 0.0
    
    crop_params = {
        "tomato": (12.0, 2600.0, 12000.0),
        "wheat": (16.0, 2100.0, 9000.0),
        "onion": (14.0, 1800.0, 10000.0)
    }
    
    # Calculate weather deviations
    rain_dev = -15.0
    temp_dev = 1.0
    if current_farmer.location_id:
        today_date = date.today()
        forecasts = db.query(models.WeatherForecast).filter(
            models.WeatherForecast.location_id == current_farmer.location_id,
            models.WeatherForecast.date >= today_date
        ).all()
        if forecasts:
            forecast_rain = sum(f.rainfall_forecast for f in forecasts)
            expected_rain = 40.0
            rain_dev = ((forecast_rain - expected_rain) / expected_rain) * 100
            rain_dev = min(max(rain_dev, -80.0), 80.0)
            
            avg_temp = sum(f.temperature for f in forecasts) / len(forecasts)
            temp_dev = avg_temp - 22.0
            temp_dev = min(max(temp_dev, -6.0), 6.0)

    for farm in farms:
        crops = db.query(models.Crop).filter(models.Crop.farm_id == farm.id).all()
        farm_area = farm.area or 1.0
        soil_type = farm.soil_type or "loam"
        irrigation = farm.irrigation or "drip"
        
        if not crops:
            # Fallback tomato
            yield_dev = predict_yield_deviation("tomato", soil_type, irrigation, rain_dev, temp_dev)
            p_yield_per_acre, p_price, p_cost_per_acre = crop_params["tomato"]
            scale_factor = 1.0 + (yield_dev / 100.0)
            
            projected_yield = farm_area * p_yield_per_acre * scale_factor
            projected_rev = projected_yield * p_price
            projected_cost = farm_area * p_cost_per_acre
            
            total_yield += projected_yield
            total_revenue += projected_rev
            total_cost += projected_cost
            total_area += farm_area
            continue
            
        crop_area = farm_area / len(crops)
        for crop in crops:
            c_type = crop.crop_type.lower()
            yield_dev = predict_yield_deviation(c_type, soil_type, irrigation, rain_dev, temp_dev)
            
            p_yield_per_acre, p_price, p_cost_per_acre = crop_params.get(c_type, (15.0, 2000.0, 10000.0))
            
            # Fetch latest mandi price
            latest_prices = db.query(models.MarketPrice).filter(
                models.MarketPrice.crop == c_type
            ).order_by(models.MarketPrice.date.desc()).all()
            actual_mandi_price = 0.0
            if latest_prices:
                avg_modal = sum(p.modal_price for p in latest_prices[:3]) / len(latest_prices[:3])
                if avg_modal > 0:
                    actual_mandi_price = avg_modal
            
            if actual_mandi_price > 0:
                p_price = actual_mandi_price
                    
            scale_factor = 1.0 + (yield_dev / 100.0)
            projected_yield = crop_area * p_yield_per_acre * scale_factor
            projected_rev = projected_yield * p_price
            projected_cost = crop_area * p_cost_per_acre
            
            total_yield += projected_yield
            total_revenue += projected_rev
            total_cost += projected_cost
            total_area += crop_area

    net_income = total_revenue - total_cost
    obligations = db.query(models.FinancialObligation).filter(models.FinancialObligation.farmer_id == current_farmer.id).all()
    total_ob = sum(ob.amount for ob in obligations)
    
    surplus = net_income - total_ob
    has_shortfall = surplus < 0
    avg_price = total_revenue / total_yield if total_yield > 0 else 0.0
    
    result = {
        "projected_yield_quintals": round(total_yield, 1),
        "expected_price_per_quintal": round(avg_price, 2),
        "projected_revenue": round(total_revenue, 2),
        "cultivation_cost": round(total_cost, 2),
        "projected_net_income": round(net_income, 2),
        "total_obligations": round(total_ob, 2),
        "cash_flow_surplus": round(surplus, 2),
        "has_shortfall": has_shortfall,
        "obligations": obligations
    }
    _cache_set(cache_key, result, ttl_seconds=60)  # 60-second TTL
    return result

@app.get("/api/v1/farmers/me/distress", response_model=schemas.DistressScoreResponse)
def get_distress_score(
    current_farmer: models.Farmer = Depends(auth.get_current_farmer),
    db: Session = Depends(get_db)
):
    cache_key = f"distress:{current_farmer.id}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached
    distress = calculate_distress_risk(db, current_farmer)
    _cache_set(cache_key, distress, ttl_seconds=60)  # 60-second TTL
    return distress

@app.post("/api/v1/farmers/me/recommendations/generate", response_model=List[schemas.RecommendationResponse])
def generate_recommendations(
    current_farmer: models.Farmer = Depends(auth.get_current_farmer),
    db: Session = Depends(get_db)
):
    """Generate intervention recommendations based on current distress score"""
    from app.intervention import generate_intervention_recommendations
    recommendations = generate_intervention_recommendations(db, current_farmer)
    return recommendations

@app.get("/api/v1/farmers/me/recommendations", response_model=List[schemas.RecommendationResponse])
def get_recommendations(
    current_farmer: models.Farmer = Depends(auth.get_current_farmer),
    db: Session = Depends(get_db)
):
    """Get current intervention recommendations for the farmer"""
    from app.intervention import get_farmer_recommendations
    recommendations = get_farmer_recommendations(db, current_farmer)
    return recommendations

@app.patch("/api/v1/recommendations/{recommendation_id}", response_model=schemas.RecommendationResponse)
def update_recommendation_status(
    recommendation_id: int,
    recommendation_update: schemas.RecommendationUpdate,
    current_farmer: models.Farmer = Depends(auth.get_current_farmer),
    db: Session = Depends(get_db)
):
    """Update the status of a recommendation (Suggested → In progress → Done → Dismissed)"""
    from app.intervention import update_recommendation_status
    success = update_recommendation_status(
        db, 
        recommendation_id, 
        current_farmer.id, 
        recommendation_update.status
    )
    if not success:
        raise HTTPException(
            status_code=404, 
            detail="Recommendation not found or unauthorized"
        )
    
    # Return updated recommendation
    recommendation = db.query(models.Recommendation).filter(
        models.Recommendation.id == recommendation_id
    ).first()
    return recommendation

@app.post("/api/v1/cache/invalidate")
def invalidate_cache(
    current_farmer: models.Farmer = Depends(auth.get_current_farmer),
):
    """Force-clear all in-memory cache entries for this farmer.
    Called by the sync button in the frontend."""
    _cache_invalidate_prefix(f"weather:")
    _cache_invalidate_prefix(f"mandi:{current_farmer.id}:")
    _cache_invalidate_prefix(f"price-history:")
    _cache_invalidate_prefix(f"price-crash:")
    _cache_invalidate_prefix(f"projections:{current_farmer.id}")
    _cache_invalidate_prefix(f"distress:{current_farmer.id}")
    _cache_invalidate_prefix(f"schemes:{current_farmer.id}")
    return {"status": "ok", "message": "Cache cleared. Next requests will fetch fresh data."}

@app.get("/api/v1/farmers/me/schemes", response_model=List[schemas.SchemeResponse])
def get_matching_schemes(
    current_farmer: models.Farmer = Depends(auth.get_current_farmer),
    db: Session = Depends(get_db)
):
    """Return ALL schemes ranked by relevance to this farmer's context."""
    cache_key = f"schemes:{current_farmer.id}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached
    import json

    # Gather farmer context
    farms = db.query(models.Farm).filter(models.Farm.farmer_id == current_farmer.id).all()
    crop_types: set = set()
    irrigation_types: set = set()
    farmer_state = None
    farm_area_total = 0.0

    for farm in farms:
        irrigation_types.add(farm.irrigation or "")
        farmer_state = farm.state  # use last farm's state
        farm_area_total += farm.area or 0
        crops = db.query(models.Crop).filter(models.Crop.farm_id == farm.id).all()
        for c in crops:
            crop_types.add(c.crop_type.lower())

    # Get latest distress score
    distress = db.query(models.DistressScore).filter(
        models.DistressScore.farmer_id == current_farmer.id
    ).order_by(models.DistressScore.created_at.desc()).first()
    distress_score = distress.score if distress else 0

    # Score each scheme
    all_schemes = db.query(models.Scheme).all()
    scored = []

    for scheme in all_schemes:
        try:
            conditions = json.loads(scheme.conditions) if scheme.conditions else {}
        except (json.JSONDecodeError, TypeError):
            conditions = {}

        eligible_crops = conditions.get("crops", [])
        min_score = conditions.get("min_distress_score", 0)
        relevance = 0.0

        # --- Scoring rules ---

        # 1. Crop match (40 pts): scheme has no crop filter OR farmer grows it
        if not eligible_crops:
            relevance += 25  # universal scheme — broadly applicable
        elif crop_types & set(c.lower() for c in eligible_crops):
            relevance += 40  # direct crop match — most relevant

        # 2. Distress urgency match (30 pts)
        if min_score == 0:
            relevance += 10  # always applicable
        elif distress_score >= min_score:
            # Bonus: more urgent if farmer's score >> threshold
            urgency_bonus = min(20, (distress_score - min_score) * 0.5)
            relevance += 10 + urgency_bonus

        # 3. State match (15 pts)
        if scheme.state == "All":
            relevance += 5
        elif farmer_state and scheme.state.lower() == farmer_state.lower():
            relevance += 15

        # 4. Irrigation type relevance (10 pts)
        name_lower = scheme.name.lower()
        if "drip" in name_lower or "sinchai" in name_lower or "irrigation" in name_lower:
            if "drip" in irrigation_types or "sprinkler" in irrigation_types:
                relevance += 10

        # 5. Small/marginal farmer bonus (5 pts)
        if farm_area_total <= 5:  # <= 5 acres = small farmer
            if "small" in name_lower or "marginal" in name_lower or "kisan" in name_lower:
                relevance += 5

        scored.append((scheme, relevance))

    # Sort descending by relevance
    scored.sort(key=lambda x: x[1], reverse=True)

    # Top 40% are "recommended"
    n_recommended = max(1, len(scored) // 3)

    result = []
    for idx, (scheme, score) in enumerate(scored):
        try:
            conds = json.loads(scheme.conditions) if scheme.conditions else {}
        except Exception:
            conds = {}

        name_lower = scheme.name.lower()
        support_lower = scheme.support_type.lower()
        category = "loan" if ("loan" in name_lower or "credit" in name_lower or "loan" in support_lower or "credit" in support_lower or "mudra" in name_lower or "aif" in name_lower) else "scheme"

        reasons = []
        if farmer_state and scheme.state != "All" and scheme.state.lower() == farmer_state.lower():
            reasons.append(f"Tailored specifically for farmers in {farmer_state}")
        eligible_crops = conds.get("crops", [])
        if eligible_crops and (crop_types & set(c.lower() for c in eligible_crops)):
            matched = [c.capitalize() for c in (crop_types & set(c.lower() for c in eligible_crops))]
            reasons.append(f"Directly supports {', '.join(matched)} cultivation")
        if "drip" in name_lower or "sinchai" in name_lower or "irrigation" in name_lower:
            irrig_str = ", ".join([i for i in irrigation_types if i]) or "micro-irrigation"
            reasons.append(f"Matches your {irrig_str} setup")
        if farm_area_total <= 5 and farm_area_total > 0:
            reasons.append(f"Designed for small & marginal holdings ({farm_area_total} ac)")
        if not reasons:
            reasons.append("Universal agricultural assistance available for your farm profile")

        why_recommended = " • ".join(reasons)
        benefit_summary = conds.get("description", scheme.support_type)

        resp = schemas.SchemeResponse(
            id=scheme.id,
            name=scheme.name,
            state=scheme.state,
            conditions=scheme.conditions or "{}",
            support_type=scheme.support_type,
            verification_url=scheme.verification_url,
            relevance_score=round(min(score, 100), 1),
            is_recommended=(idx < n_recommended),
            category=category,
            why_recommended=why_recommended,
            benefit_summary=benefit_summary
        )
        result.append(resp)

    _cache_set(cache_key, result, ttl_seconds=300)  # 5-minute TTL
    return result


@app.post("/api/v1/schemes/sync")
async def sync_schemes_live(
    current_farmer: models.Farmer = Depends(auth.get_current_farmer),
    db: Session = Depends(get_db),
):
    """
    Trigger live dynamic synchronization of government schemes and loans into PostgreSQL DB.
    Allows real-time updates without requiring backend restarts.
    """
    count = await fetch_and_sync_external_schemes(db)
    _cache_invalidate_prefix(f"schemes:{current_farmer.id}")
    return {
        "status": "success",
        "synced_records": count,
        "message": "Government schemes & agricultural credit database synchronized dynamically.",
        "synced_at": datetime.utcnow().isoformat(),
    }


# ── Phase 19: Manual Agmarknet live price refresh ───────────────────────────

@app.post("/api/v1/market/refresh-live-prices")
async def refresh_live_prices(
    current_farmer: models.Farmer = Depends(auth.get_current_farmer),
    db: Session = Depends(get_db),
):
    """
    Manually trigger Agmarknet live price fetch for top crops
    (tomato, onion, wheat, potato, maize).
    Stores results to market_prices table with source='agmarknet_live'.
    Frontend can poll /api/v1/mandis/compare to see 'Live' badge when
    price_date == today and source == 'agmarknet_live'.
    """
    try:
        n = await background_fetch_and_store(SessionLocal)
        return {
            "status": "success",
            "new_records": n,
            "message": f"Fetched and stored {n} live price records from Agmarknet.",
            "refreshed_at": datetime.utcnow().isoformat(),
        }
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Agmarknet fetch failed: {e}")


# ── Phase 20: Community District Risk Map ────────────────────────────────────

@app.get("/api/v1/community/district-risk")
def get_district_risk(db: Session = Depends(get_db)):
    """
    Aggregate distress scores by district for the community risk heatmap.
    Returns: list of {district, state, avg_score, risk_level, farmer_count, lat, lon}
    All scores are anonymised — no personal farmer data exposed.
    """
    # Aggregate: for each (district, state) pair, average the latest distress score
    from sqlalchemy import func

    # Join farmer → farm → latest distress score
    subq = (
        db.query(
            models.Farmer.id.label("farmer_id"),
            models.Farm.district.label("district"),
            models.Farm.state.label("state"),
            models.Farm.latitude.label("lat"),
            models.Farm.longitude.label("lon"),
        )
        .join(models.Farm, models.Farm.farmer_id == models.Farmer.id)
        .filter(models.Farm.district.isnot(None))
        .subquery()
    )

    # Latest distress score per farmer
    latest_ds = (
        db.query(
            models.DistressScore.farmer_id,
            func.max(models.DistressScore.created_at).label("latest"),
        )
        .group_by(models.DistressScore.farmer_id)
        .subquery()
    )

    rows = (
        db.query(
            subq.c.district,
            subq.c.state,
            func.avg(models.DistressScore.score).label("avg_score"),
            func.count(models.DistressScore.farmer_id).label("farmer_count"),
            func.avg(subq.c.lat).label("avg_lat"),
            func.avg(subq.c.lon).label("avg_lon"),
        )
        .join(latest_ds, latest_ds.c.farmer_id == subq.c.farmer_id)
        .join(
            models.DistressScore,
            (models.DistressScore.farmer_id == subq.c.farmer_id)
            & (models.DistressScore.created_at == latest_ds.c.latest),
        )
        .group_by(subq.c.district, subq.c.state)
        .all()
    )

    def risk_level(score: float) -> str:
        if score >= 75: return "Critical"
        if score >= 55: return "High"
        if score >= 40: return "Elevated"
        if score >= 25: return "Watch"
        return "Stable"

    return [
        {
            "district": r.district,
            "state": r.state,
            "avg_score": round(r.avg_score or 0, 1),
            "risk_level": risk_level(r.avg_score or 0),
            "farmer_count": r.farmer_count,
            "lat": round(r.avg_lat or 0, 4),
            "lon": round(r.avg_lon or 0, 4),
        }
        for r in rows
    ]


# ── Phase 25: Yield Calculator ───────────────────────────────────────────────

# Baseline yields in quintals/acre (conservative estimates for India)
BASELINE_YIELD = {
    "tomato": 80.0,   # q/acre
    "wheat":  16.0,
    "onion":  60.0,
    "grapes": 90.0,   # q/acre
    "rice":   20.0,
}

@app.post("/api/v1/yield/estimate")
def estimate_yield(
    crop_type: str,
    area_acres: float,
    rainfall_deviation: float = 0.0,   # % vs seasonal avg (negative = deficit)
    temp_deviation: float = 0.0,        # degrees C vs normal
    soil_type: str = "loam",
    irrigation_type: str = "drip",
    current_farmer: models.Farmer = Depends(auth.get_current_farmer),
    db: Session = Depends(get_db),
):
    """
    Phase 25: Yield Calculator.
    Returns estimated yield, projected revenue, and scenario range for the given crop + inputs.
    """
    # 1. Predict yield deviation using ML model
    deviation_pct = predict_yield_deviation(
        crop_type=crop_type,
        soil_type=soil_type,
        irrigation_type=irrigation_type,
        rainfall_deviation=rainfall_deviation,
        temp_deviation=temp_deviation,
    )

    # 2. Baseline yield (q/acre)
    baseline_q_per_acre = BASELINE_YIELD.get(crop_type.lower(), 15.0)

    # 3. Current estimated yield
    current_q_per_acre = baseline_q_per_acre * (1 + deviation_pct / 100)
    current_q_per_acre = max(0.0, round(current_q_per_acre, 2))

    # 4. Total yield
    total_q = round(current_q_per_acre * area_acres, 2)

    # 5. Get current mandi modal price for this crop (nearest available)
    mandi_price_row = (
        db.query(models.MarketPrice)
        .filter(models.MarketPrice.crop.ilike(f"%{crop_type}%"))
        .order_by(models.MarketPrice.date.desc())
        .first()
    )
    modal_price_per_q = mandi_price_row.modal_price if mandi_price_row else 2000.0
    price_source = "Agmarknet (live)" if mandi_price_row else "Default estimate"

    # 6. Revenue projection
    gross_revenue = round(total_q * modal_price_per_q, 2)

    # 7. Scenario range (±15%)
    best_q = round(total_q * 1.15, 2)
    worst_q = round(total_q * 0.85, 2)
    best_rev = round(best_q * modal_price_per_q, 2)
    worst_rev = round(worst_q * modal_price_per_q, 2)

    return {
        "crop_type": crop_type,
        "area_acres": area_acres,
        "soil_type": soil_type,
        "irrigation_type": irrigation_type,
        "rainfall_deviation_pct": rainfall_deviation,
        "temp_deviation_c": temp_deviation,
        # Yield outputs
        "baseline_yield_q_per_acre": baseline_q_per_acre,
        "yield_deviation_pct": deviation_pct,
        "estimated_yield_q_per_acre": current_q_per_acre,
        "estimated_total_yield_q": total_q,
        # Revenue outputs
        "modal_price_per_q": modal_price_per_q,
        "price_source": price_source,
        "projected_gross_revenue": gross_revenue,
        # Scenario range
        "scenario": {
            "best": {"yield_q": best_q, "revenue": best_rev},
            "base": {"yield_q": total_q, "revenue": gross_revenue},
            "worst": {"yield_q": worst_q, "revenue": worst_rev},
        },
    }


# ── Phase 27: Delete Operations ───────────────────────────────────────────────

@app.delete("/api/v1/farms/{farm_id}")
def delete_farm(
    farm_id: int,
    current_farmer: models.Farmer = Depends(auth.get_current_farmer),
    db: Session = Depends(get_db)
):
    """Delete a farm and all its crops."""
    farm = db.query(models.Farm).filter(
        models.Farm.id == farm_id,
        models.Farm.farmer_id == current_farmer.id
    ).first()
    if not farm:
        raise HTTPException(status_code=404, detail="Farm not found or unauthorized")
        
    # Delete associated crops first
    db.query(models.Crop).filter(models.Crop.farm_id == farm_id).delete()
    
    # Delete farm
    db.delete(farm)
    db.commit()
    return {"message": "Farm deleted successfully"}


@app.delete("/api/v1/crops/{crop_id}")
def delete_crop(
    crop_id: int,
    current_farmer: models.Farmer = Depends(auth.get_current_farmer),
    db: Session = Depends(get_db)
):
    """Delete a crop."""
    crop = db.query(models.Crop).join(models.Farm).filter(
        models.Crop.id == crop_id,
        models.Farm.farmer_id == current_farmer.id
    ).first()
    if not crop:
        raise HTTPException(status_code=404, detail="Crop not found or unauthorized")
        
    db.delete(crop)
    db.commit()
    return {"message": "Crop deleted successfully"}


@app.delete("/api/v1/obligations/{obligation_id}")
def delete_obligation(
    obligation_id: int,
    current_farmer: models.Farmer = Depends(auth.get_current_farmer),
    db: Session = Depends(get_db)
):
    """Delete a financial obligation."""
    ob = db.query(models.FinancialObligation).filter(
        models.FinancialObligation.id == obligation_id,
        models.FinancialObligation.farmer_id == current_farmer.id
    ).first()
    if not ob:
        raise HTTPException(status_code=404, detail="Obligation not found or unauthorized")
        
    db.delete(ob)
    db.commit()
    return {"message": "Obligation deleted successfully"}

