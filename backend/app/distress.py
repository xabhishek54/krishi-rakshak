import datetime
from sqlalchemy.orm import Session
from . import models
from app.yield_model import predict_yield_deviation

def calculate_distress_risk(db: Session, farmer: models.Farmer) -> models.DistressScore:
    # 1. Weather Component (Default expected rain deviation)
    # Check weather forecast rainfall vs baseline (40mm)
    rain_dev = -15.0 # default dry bias
    temp_dev = 1.0  # warmer default
    
    today = datetime.date.today()
    forecasts = db.query(models.WeatherForecast).filter(
        models.WeatherForecast.location_id == farmer.location_id,
        models.WeatherForecast.date >= today
    ).all()
    
    if forecasts:
        forecast_rain = sum(f.rainfall_forecast for f in forecasts)
        expected_rain = 40.0
        rain_dev = ((forecast_rain - expected_rain) / expected_rain) * 100
        rain_dev = min(max(rain_dev, -80.0), 80.0)
        
        avg_temp = sum(f.temperature for f in forecasts) / len(forecasts)
        temp_dev = avg_temp - 22.0
        temp_dev = min(max(temp_dev, -6.0), 6.0)
        
    weather_score = max(0.0, -rain_dev) # Deficit maps to risk
    if temp_dev > 2.0:
        weather_score += (temp_dev - 2.0) * 15.0
    weather_score = min(100.0, weather_score)
    
    # 2. Yield Component (using RandomForest ML yield model deviation prediction)
    farm = db.query(models.Farm).filter(models.Farm.farmer_id == farmer.id).first()
    crop_type = "tomato"
    soil_type = "loam"
    irrigation = "drip"
    farm_area = 2.5
    
    if farm:
        farm_area = farm.area
        soil_type = farm.soil_type
        irrigation = farm.irrigation
        crop = db.query(models.Crop).filter(models.Crop.farm_id == farm.id).first()
        if crop:
            crop_type = crop.crop_type.lower()
            
    yield_dev = predict_yield_deviation(crop_type, soil_type, irrigation, rain_dev, temp_dev)
    # Yield drop triggers risk
    yield_score = min(100.0, max(0.0, -yield_dev * 1.8))
    
    # 3. Market Component (Price crash vs historical average)
    # Tomato base price = 2600, Wheat = 2100, Onion = 1800
    base_prices = {"tomato": 2600.0, "wheat": 2100.0, "onion": 1800.0}
    base_price = base_prices.get(crop_type, 2600.0)
    
    # Find latest modal price in Nashik district APMCs
    latest_prices = db.query(models.MarketPrice).filter(
        models.MarketPrice.crop == crop_type
    ).order_by(models.MarketPrice.date.desc()).all()
    
    market_score = 0.0
    if latest_prices:
        avg_modal = sum(p.modal_price for p in latest_prices[:3]) / len(latest_prices[:3])
        if avg_modal < base_price:
            price_drop_pct = ((base_price - avg_modal) / base_price) * 100.0
            market_score = min(100.0, price_drop_pct * 3.0)
            
    # 4. Financial Component (Income coverage shortfall)
    crop_params = {
        "tomato": (12.0, 2600.0, 12000.0),
        "wheat": (16.0, 2100.0, 9000.0),
        "onion": (14.0, 1800.0, 10000.0)
    }
    p_yield_per_acre, p_price, p_cost_per_acre = crop_params.get(crop_type, (12.0, 2600.0, 12000.0))
    scale_factor = 1.0 + (yield_dev / 100.0)
    
    projected_yield = farm_area * p_yield_per_acre * scale_factor
    projected_rev = projected_yield * p_price
    projected_cost = farm_area * p_cost_per_acre
    net_income = projected_rev - projected_cost
    
    obligations = db.query(models.FinancialObligation).filter(
        models.FinancialObligation.farmer_id == farmer.id
    ).all()
    total_ob = sum(ob.amount for ob in obligations)
    
    financial_score = 0.0
    if total_ob > 0:
        if net_income <= 0:
            financial_score = 100.0
        else:
            coverage = net_income / total_ob
            if coverage < 1.0:
                financial_score = min(100.0, (1.0 - coverage) * 150.0)
    elif total_ob == 0 and net_income < 0:
        financial_score = 30.0 # operating shortfall risk
        
    # 5. Urgency Component (Days left until obligation due date)
    urgency_score = 0.0
    if obligations:
        due_dates = [ob.due_date for ob in obligations if ob.due_date >= today]
        if due_dates:
            min_due = min(due_dates)
            days_left = (min_due - today).days
            if days_left <= 7:
                urgency_score = 100.0
            elif days_left <= 15:
                urgency_score = 75.0
            elif days_left <= 30:
                urgency_score = 40.0
            else:
                urgency_score = 10.0
                
    # Weighted average: 20% each
    overall_score = (weather_score + yield_score + market_score + financial_score + urgency_score) / 5.0
    overall_score = round(overall_score, 1)
    
    # Severity mapping
    if overall_score >= 75.0:
        risk_level = "Critical"
    elif overall_score >= 50.0:
        risk_level = "High"
    elif overall_score >= 35.0:
        risk_level = "Elevated"
    elif overall_score >= 20.0:
        risk_level = "Watch"
    else:
        risk_level = "Stable"
        
    new_distress = models.DistressScore(
        farmer_id=farmer.id,
        score=overall_score,
        weather_component=round(weather_score, 1),
        market_component=round(market_score, 1),
        yield_component=round(yield_score, 1),
        financial_component=round(financial_score, 1),
        urgency_component=round(urgency_score, 1),
        risk_level=risk_level
    )
    db.add(new_distress)
    db.commit()
    db.refresh(new_distress)
    return new_distress
