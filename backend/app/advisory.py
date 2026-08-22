import json
import os
from sqlalchemy.orm import Session
from datetime import date, timedelta
from typing import List, Dict, Any

from app import models

# Load rules from rules.json
RULES_PATH = os.path.join(os.path.dirname(__file__), "rules.json")

def load_rules() -> Dict[str, Any]:
    try:
        with open(RULES_PATH, "r") as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading rules config: {e}")
        return {"advisory_rules": [], "pest_rules": []}

def evaluate_advisories(db: Session, farmer: models.Farmer) -> List[models.Advisory]:
    """
    Evaluate agricultural advisory rules and pest rules for the farmer's crops.
    Creates and returns matching advisories/alerts.
    """
    # 1. Fetch farmer's location and farms
    location_id = farmer.location_id
    if not location_id:
        return []
    
    farms = db.query(models.Farm).filter(models.Farm.farmer_id == farmer.id).all()
    if not farms:
        return []
    
    # 2. Fetch weather observations (past 5 days) and forecasts (next 7 days)
    today = date.today()
    past_date = today - timedelta(days=5)
    
    observations = db.query(models.WeatherObservation).filter(
        models.WeatherObservation.location_id == location_id,
        models.WeatherObservation.date >= past_date
    ).all()
    
    forecasts = db.query(models.WeatherForecast).filter(
        models.WeatherForecast.location_id == location_id,
        models.WeatherForecast.date >= today
    ).all()
    
    # Organize weather values by date
    weather_by_date = {}
    for obs in observations:
        weather_by_date[obs.date] = {
            "rainfall": obs.rainfall,
            "temperature": obs.temperature,
            "humidity": obs.humidity
        }
    for fc in forecasts:
        # Forecast takes precedence for today/future
        weather_by_date[fc.date] = {
            "rainfall": fc.rainfall_forecast,
            "temperature": fc.temperature,
            "humidity": 80.0 # Default fallback humidity if forecast doesn't track it
        }

    # Helper values for rule check
    rain_next_24h = 0.0
    max_temp = 0.0
    
    # Calculate rain next 24h
    for fc in forecasts:
        if fc.date == today or fc.date == today + timedelta(days=1):
            rain_next_24h = max(rain_next_24h, fc.rainfall_forecast)
            max_temp = max(max_temp, fc.temperature)
            
    # Load the rules config
    rules_config = load_rules()
    generated_advisories = []

    # 3. Evaluate rules for each crop in each farm
    for farm in farms:
        crops = db.query(models.Crop).filter(models.Crop.farm_id == farm.id).all()
        for crop in crops:
            crop_type = crop.crop_type.lower()
            crop_stage = crop.stage.lower() if crop.stage else "vegetative"
            
            # --- EVALUATE ADVISORY RULES ---
            for rule in rules_config.get("advisory_rules", []):
                rule_crop = rule["crop"].lower()
                rule_stage = rule["stage"].lower()
                
                # Check crop/stage match
                crop_match = (rule_crop == "*" or rule_crop in crop_type)
                stage_match = (rule_stage == "*" or rule_stage == crop_stage)
                
                if crop_match and stage_match:
                    conditions = rule["conditions"]
                    match = True
                    
                    if "rain_forecast_24h_min" in conditions:
                        if rain_next_24h < conditions["rain_forecast_24h_min"]:
                            match = False
                    if "temperature_max" in conditions:
                        if max_temp < conditions["temperature_max"]:
                            match = False
                            
                    if match:
                        adv_payload = rule["advisory"]
                        # Check if duplicate already exists
                        existing = db.query(models.Advisory).filter(
                            models.Advisory.farm_id == farm.id,
                            models.Advisory.recommendation == adv_payload["recommendation"]
                        ).first()
                        
                        if not existing:
                            priority_str = "high" if adv_payload["priority"] == 1 else "medium" if adv_payload["priority"] == 2 else "low"
                            new_adv = models.Advisory(
                                farm_id=farm.id,
                                category=adv_payload["category"],
                                priority=priority_str,
                                recommendation=adv_payload["recommendation"],
                                reason=adv_payload["reason"]
                            )
                            db.add(new_adv)
                            generated_advisories.append(new_adv)
                            
            # --- EVALUATE PEST RULES ---
            for p_rule in rules_config.get("pest_rules", []):
                p_crop = p_rule["crop"].lower()
                p_stage = p_rule["stage"].lower()
                
                crop_match = (p_crop == "*" or p_crop in crop_type)
                stage_match = (p_stage == "*" or p_stage == crop_stage)
                
                if crop_match and stage_match:
                    cond = p_rule["conditions"]
                    persistence = cond.get("persistence_days", 1)
                    humidity_th = cond.get("humidity_threshold", 75.0)
                    t_min = cond.get("temp_min", 0.0)
                    t_max = cond.get("temp_max", 100.0)
                    
                    # Check weather criteria over persistence window
                    match = True
                    for offset in range(persistence):
                        check_date = today - timedelta(days=offset)
                        day_weather = weather_by_date.get(check_date)
                        if not day_weather:
                            match = False
                            break
                        
                        h = day_weather.get("humidity", 0.0)
                        t = day_weather.get("temperature", 0.0)
                        
                        if h < humidity_th or t < t_min or t > t_max:
                            match = False
                            break
                            
                    if match:
                        pest_payload = p_rule["pest"]
                        # Save under Alerts table
                        severity_str = "Critical" if pest_payload["priority"] == 1 else "Elevated"
                        reason_str = f"{pest_payload['warning']}: {pest_payload['explanation']}"
                        
                        existing_alert = db.query(models.Alert).filter(
                            models.Alert.farmer_id == farmer.id,
                            models.Alert.reason == reason_str,
                            models.Alert.status == "open"
                        ).first()
                        
                        if not existing_alert:
                            new_alert = models.Alert(
                                farmer_id=farmer.id,
                                severity=severity_str,
                                reason=reason_str,
                                status="open"
                            )
                            db.add(new_alert)
                            
    db.commit()
    # Refresh all objects
    for adv in generated_advisories:
        db.refresh(adv)
    return generated_advisories
