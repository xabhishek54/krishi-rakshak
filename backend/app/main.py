from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
from datetime import date, datetime, timedelta

from app.database import engine, Base, get_db, SessionLocal
from app import models, schemas, auth
from app.weather import OpenMeteoProvider
from app.advisory import evaluate_advisories
from app.mandi import seed_mandi_data, get_mandi_comparison, detect_price_crash, get_price_history
from app.yield_model import predict_yield_deviation
from app.distress import calculate_distress_risk
from app.schemes import seed_scheme_data
from app.migrations import run_migrations
from app.agmarknet import background_fetch_and_store  # Phase 19
import asyncio

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
    # Auto-apply any missing schema columns before anything else
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

    # Auto-seed rich demo farmer if they don't exist or have fewer than 5 farms
    try:
        from seed_demo import seed_farmer_data, DEMO_PHONE
        farmer = db.query(models.Farmer).filter(models.Farmer.phone == DEMO_PHONE).first()
        if not farmer or len(farmer.farms) < 5:
            print("[startup] Auto-seeding rich demo farmer environment...")
            seed_farmer_data(db)
    except Exception as e:
        print("Auto-seeding demo farmer failed:", e)

    # Phase 19: Launch Agmarknet background price fetch (non-blocking)
    async def _agmarknet_bg():
        try:
            n = await background_fetch_and_store(SessionLocal)
            print(f"[Phase19] Agmarknet background fetch complete: {n} new price records")
        except Exception as e:
            print(f"[Phase19] Agmarknet fetch failed (non-critical): {e}")

    asyncio.create_task(_agmarknet_bg())

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
    """Compare mandis using the farm closest to any mandi (not just the first farm)."""
    import math

    def _dist(lat1, lon1, lat2, lon2):
        R = 6371
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
        return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    farms = db.query(models.Farm).filter(
        models.Farm.farmer_id == current_farmer.id,
        models.Farm.latitude.isnot(None),
        models.Farm.longitude.isnot(None)
    ).all()

    mandis = db.query(models.Mandi).all()

    if not farms or not mandis:
        lat, lon = 20.08, 74.11  # default Nashik
    else:
        # Pick the farm with the minimum distance to its nearest mandi
        best_farm = farms[0]
        best_min_dist = float("inf")
        for farm in farms:
            if farm.latitude is None or farm.longitude is None:
                continue
            for mandi in mandis:
                if mandi.latitude is None or mandi.longitude is None:
                    continue
                d = _dist(farm.latitude, farm.longitude, mandi.latitude, mandi.longitude)
                if d < best_min_dist:
                    best_min_dist = d
                    best_farm = farm
        lat = best_farm.latitude or 20.08
        lon = best_farm.longitude or 74.11

    return get_mandi_comparison(db, crop, lat, lon)


@app.get("/api/v1/market/price-crash", response_model=schemas.PriceCrashResponse)
def get_price_crash(
    crop: str,
    mandi_id: int,
    current_farmer: models.Farmer = Depends(auth.get_current_farmer),
    db: Session = Depends(get_db)
):
    # Verify that the mandi belongs to the farmer's district (optional, but we can check via farm location)
    # For simplicity, we just compute for the given mandi and crop.
    result = detect_price_crash(db, crop, mandi_id)
    return result

@app.get("/api/v1/market/price-history", response_model=List[schemas.PriceHistoryResponse])
def get_price_history_endpoint(
    crop: str,
    mandi_id: int,
    window: int = 30,
    current_farmer: models.Farmer = Depends(auth.get_current_farmer),
    db: Session = Depends(get_db)
):
    history = get_price_history(db, crop, mandi_id, window)
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
    
    return {
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

@app.get("/api/v1/farmers/me/distress", response_model=schemas.DistressScoreResponse)
def get_distress_score(
    current_farmer: models.Farmer = Depends(auth.get_current_farmer),
    db: Session = Depends(get_db)
):
    distress = calculate_distress_risk(db, current_farmer)
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

@app.get("/api/v1/farmers/me/schemes", response_model=List[schemas.SchemeResponse])
def get_matching_schemes(
    current_farmer: models.Farmer = Depends(auth.get_current_farmer),
    db: Session = Depends(get_db)
):
    """Return ALL schemes ranked by relevance to this farmer's context."""
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
        # Build response dict (since we need to add computed fields)
        resp = schemas.SchemeResponse(
            id=scheme.id,
            name=scheme.name,
            state=scheme.state,
            conditions=scheme.conditions or "{}",
            support_type=scheme.support_type,
            verification_url=scheme.verification_url,
            relevance_score=round(min(score, 100), 1),
            is_recommended=(idx < n_recommended)
        )
        result.append(resp)

    return result


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
    "potato": 100.0,
    "maize":  18.0,
    "rice":   20.0,
    "cotton": 7.0,
    "soybean": 8.0,
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

