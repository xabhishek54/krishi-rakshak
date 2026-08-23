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
    
    # 2. Yield & 3. Market & 4. Financial Components (aggregated across all farms and crops)
    farms = db.query(models.Farm).filter(models.Farm.farmer_id == farmer.id).all()
    
    total_area = 0.0
    total_yield_weighted_score = 0.0
    total_market_weighted_score = 0.0
    total_projected_rev = 0.0
    total_projected_cost = 0.0
    
    base_prices = {"tomato": 2600.0, "wheat": 2100.0, "onion": 1800.0}
    crop_params = {
        "tomato": (12.0, 2600.0, 12000.0),
        "wheat": (16.0, 2100.0, 9000.0),
        "onion": (14.0, 1800.0, 10000.0)
    }
    
    # Track crop areas to do weighted averages for yield and market components
    crop_count = 0
    
    for farm in farms:
        crops = db.query(models.Crop).filter(models.Crop.farm_id == farm.id).all()
        farm_area = farm.area or 1.0
        soil_type = farm.soil_type or "loam"
        irrigation = farm.irrigation or "drip"
        
        # If no crops registered on this farm, assign a default layout to calculate costs/potential revenue
        if not crops:
            # Assume tomato fallback for cost/revenue calculation
            yield_dev = predict_yield_deviation("tomato", soil_type, irrigation, rain_dev, temp_dev)
            p_yield_per_acre, p_price, p_cost_per_acre = crop_params["tomato"]
            scale_factor = 1.0 + (yield_dev / 100.0)
            
            projected_yield = farm_area * p_yield_per_acre * scale_factor
            projected_rev = projected_yield * p_price
            projected_cost = farm_area * p_cost_per_acre
            
            total_projected_rev += projected_rev
            total_projected_cost += projected_cost
            total_area += farm_area
            continue
            
        # If crops are present, loop through them and allocate area proportionally
        crop_area = farm_area / len(crops)
        for crop in crops:
            c_type = crop.crop_type.lower()
            yield_dev = predict_yield_deviation(c_type, soil_type, irrigation, rain_dev, temp_dev)
            
            # Yield score for this crop
            c_yield_score = min(100.0, max(0.0, -yield_dev * 1.8))
            
            # Market price for this crop
            c_base_price = base_prices.get(c_type, 2000.0)
            latest_prices = db.query(models.MarketPrice).filter(
                models.MarketPrice.crop == c_type
            ).order_by(models.MarketPrice.date.desc()).all()
            
            c_market_score = 0.0
            actual_mandi_price = c_base_price
            if latest_prices:
                avg_modal = sum(p.modal_price for p in latest_prices[:3]) / len(latest_prices[:3])
                actual_mandi_price = avg_modal
                if avg_modal < c_base_price:
                    price_drop_pct = ((c_base_price - avg_modal) / c_base_price) * 100.0
                    c_market_score = min(100.0, price_drop_pct * 3.0)
            
            # Financial details
            p_yield_per_acre, p_price, p_cost_per_acre = crop_params.get(c_type, (15.0, c_base_price, 10000.0))
            # Use actual mandi price if it's available and valid
            if actual_mandi_price > 0:
                p_price = actual_mandi_price
                
            scale_factor = 1.0 + (yield_dev / 100.0)
            projected_yield = crop_area * p_yield_per_acre * scale_factor
            projected_rev = projected_yield * p_price
            projected_cost = crop_area * p_cost_per_acre
            
            total_projected_rev += projected_rev
            total_projected_cost += projected_cost
            
            total_yield_weighted_score += c_yield_score * crop_area
            total_market_weighted_score += c_market_score * crop_area
            total_area += crop_area
            crop_count += 1
            
    if total_area > 0:
        yield_score = total_yield_weighted_score / total_area
        market_score = total_market_weighted_score / total_area
    else:
        yield_score = 0.0
        market_score = 0.0
        
    net_income = total_projected_rev - total_projected_cost
    
    # Financial Component
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
            else:
                # Debt is fully covered by net income, score is 0
                financial_score = 0.0
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
    
    # Distress risk reduces for larger farm holdings (greater financial cushion & scale)
    if total_area > 0:
        area_discount = min(20.0, total_area * 3.0)  # Up to 20 points discount for large landholders
        overall_score = max(0.0, overall_score - area_discount)
        
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
    
    # Generate intervention recommendations based on the new distress score
    try:
        from app.intervention import generate_intervention_recommendations
        generate_intervention_recommendations(db, farmer)
    except Exception as e:
        print(f"Failed to generate intervention recommendations: {e}")
    
    return new_distress
