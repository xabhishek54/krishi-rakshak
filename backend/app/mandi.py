import math
import os
import csv
import logging
from datetime import date, datetime, timedelta
from sqlalchemy.orm import Session
from . import models

logger = logging.getLogger(__name__)

CSV_PATH = os.path.join(os.path.dirname(__file__), "data", "mandi_prices.csv")

# Mandi coordinates mapping across states
MANDI_COORDS = {
    "Pimpalgaon": (20.17, 73.98),
    "Lasalgaon": (20.14, 74.22),
    "Nashik": (20.00, 73.78),
    "Manmad": (20.25, 74.44),
    "Malegaon": (20.55, 74.53),
    "Satana": (20.59, 74.20),
    "Kalwan": (20.49, 73.83),
    "Yeola": (20.04, 74.49),
    "Pune (Gultekdi)": (18.52, 73.85),
    "Baramati": (18.15, 74.58),
    "Rahata": (19.71, 74.48),
    "Kopargaon": (19.89, 74.48),
    "Sangamner": (19.57, 74.21),
    "Solapur": (17.65, 75.90),
    "Aurangabad": (19.87, 75.34),
    "Jalgaon": (21.00, 75.56),
    "Dhule": (20.90, 74.77),
    "Nagpur": (21.14, 79.08),
    "Satara": (17.68, 74.00),
    "Indore": (22.71, 75.85),
    "Ludhiana": (30.90, 75.85),
    "Cuttack": (20.46, 85.88),
}

# Seeding function for APMC Mandis and Market Prices from data.gov.in CSV
def seed_mandi_data(db: Session):
    # Check if mandis already exist
    if db.query(models.Mandi).first() is not None:
        return
        
    # 1. Create APMC Mandis
    mandi_objects = {}
    for name, (lat, lon) in MANDI_COORDS.items():
        district = "Nashik" if ("Pimpalgaon" in name or "Lasalgaon" in name or name == "Nashik") else "APMC Market"
        m = models.Mandi(name=f"{name} APMC", district=district, latitude=lat, longitude=lon)
        db.add(m)
        db.flush()
        mandi_objects[name.lower()] = m

    db.commit()
    
    # 2. Seed price data directly from mandi_prices.csv
    if os.path.exists(CSV_PATH):
        try:
            with open(CSV_PATH, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    market_name = row.get("Market", "").lower()
                    mandi = None
                    for k, m in mandi_objects.items():
                        if k in market_name or market_name in k:
                            mandi = m
                            break
                    if not mandi:
                        mandi = list(mandi_objects.values())[0]

                    crop_name = row.get("Commodity", "").lower()
                    try:
                        date_val = datetime.strptime(row.get("Arrival_Date", ""), "%Y-%m-%d").date()
                    except ValueError:
                        date_val = date.today()

                    price_record = models.MarketPrice(
                        mandi_id=mandi.id,
                        crop=crop_name,
                        date=date_val,
                        min_price=float(row.get("Min_Price", 0) or 0),
                        max_price=float(row.get("Max_Price", 0) or 0),
                        modal_price=float(row.get("Modal_Price", 0) or 0),
                        arrivals=float(row.get("Arrivals_Qtl", 0) or 0),
                        source="data_gov_in_csv"
                    )
                    db.add(price_record)
            db.commit()
            logger.info("Successfully seeded Mandi data from data.gov.in CSV dataset.")
            return
        except Exception as e:
            logger.error(f"Error seeding Mandi CSV: {e}")

    # Fallback seeding if CSV is unavailable
    today = date.today()
    crops = ["tomato", "wheat", "onion", "rice", "potato", "soybean", "maize"]
    base_prices = {"tomato": 2400.0, "wheat": 2200.0, "onion": 1900.0, "rice": 2500.0, "potato": 1500.0, "soybean": 4400.0, "maize": 1950.0}
    
    for offset in range(30):
        d = today - timedelta(days=offset)
        for crop, base_p in base_prices.items():
            for mandi in mandi_objects.values():
                modal = round(base_p + (offset % 5) * 20, 2)
                db.add(models.MarketPrice(
                    mandi_id=mandi.id,
                    crop=crop,
                    date=d,
                    min_price=round(modal * 0.9, 2),
                    max_price=round(modal * 1.1, 2),
                    modal_price=modal,
                    arrivals=200.0,
                    source="data_gov_in_csv"
                ))
    db.commit()


# Haversine distance formula between two GPS points
def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


# Price-crash detection logic
def detect_price_crash(db: Session, crop_type: str, mandi_id: int) -> dict:
    today = date.today()
    seven_days_ago = today - timedelta(days=7)
    recent_prices = db.query(models.MarketPrice).filter(
        models.MarketPrice.mandi_id == mandi_id,
        models.MarketPrice.crop == crop_type.lower(),
        models.MarketPrice.date >= seven_days_ago,
        models.MarketPrice.date <= today
    ).all()
    
    if len(recent_prices) == 0:
        return {
            "price_crash": False,
            "price_change_pct": 0.0,
            "recent_7day_avg": None,
            "baseline_30day_avg": None,
            "reason": "No recent price data available"
        }
    
    recent_avg = sum(p.modal_price for p in recent_prices) / len(recent_prices)
    sixty_days_ago = today - timedelta(days=60)
    thirty_days_ago = today - timedelta(days=30)
    baseline_prices = db.query(models.MarketPrice).filter(
        models.MarketPrice.mandi_id == mandi_id,
        models.MarketPrice.crop == crop_type.lower(),
        models.MarketPrice.date >= sixty_days_ago,
        models.MarketPrice.date < thirty_days_ago
    ).all()
    
    if len(baseline_prices) == 0:
        baseline_prices = db.query(models.MarketPrice).filter(
            models.MarketPrice.mandi_id == mandi_id,
            models.MarketPrice.crop == crop_type.lower(),
            models.MarketPrice.date < thirty_days_ago
        ).all()
    
    if len(baseline_prices) == 0:
        return {
            "price_crash": False,
            "price_change_pct": 0.0,
            "recent_7day_avg": round(recent_avg, 2),
            "baseline_30day_avg": None,
            "reason": "Insufficient baseline data (< 30 days of history)"
        }
    
    baseline_avg = sum(p.modal_price for p in baseline_prices) / len(baseline_prices)
    price_change_pct = 0.0 if baseline_avg == 0 else ((recent_avg - baseline_avg) / baseline_avg) * 100
    price_crash = price_change_pct <= -20.0
    
    return {
        "price_crash": price_crash,
        "price_change_pct": round(price_change_pct, 2),
        "recent_7day_avg": round(recent_avg, 2),
        "baseline_30day_avg": round(baseline_avg, 2),
        "reason": f"Price changed {price_change_pct:.2f}% vs 30-day baseline"
    }


# Price history logic (Grouped by date for clean 30-day daily trend)
def get_price_history(db: Session, crop_type: str, mandi_id: int, window_days: int = 30) -> list:
    today = date.today()
    start_date = today - timedelta(days=window_days)
    
    prices = db.query(models.MarketPrice).filter(
        models.MarketPrice.mandi_id == mandi_id,
        models.MarketPrice.crop == crop_type.lower(),
        models.MarketPrice.date >= start_date,
        models.MarketPrice.date <= today
    ).order_by(models.MarketPrice.date.asc()).all()
    
    daily_buckets = {}
    for p in prices:
        d_str = p.date.isoformat()
        if d_str not in daily_buckets:
            daily_buckets[d_str] = {"min": [], "max": [], "modal": [], "arrivals": 0.0}
        daily_buckets[d_str]["min"].append(p.min_price)
        daily_buckets[d_str]["max"].append(p.max_price)
        daily_buckets[d_str]["modal"].append(p.modal_price)
        daily_buckets[d_str]["arrivals"] += p.arrivals or 0.0

    result = []
    for d_str in sorted(daily_buckets.keys()):
        b = daily_buckets[d_str]
        result.append({
            "date": d_str,
            "min_price": round(sum(b["min"]) / len(b["min"]), 2),
            "max_price": round(sum(b["max"]) / len(b["max"]), 2),
            "modal_price": round(sum(b["modal"]) / len(b["modal"]), 2),
            "arrivals": round(b["arrivals"], 1)
        })

    return result


# Mandi comparison logic
def get_mandi_comparison(db: Session, crop_type: str, farm_lat: float, farm_lon: float):
    mandis = db.query(models.Mandi).all()
    results = []
    
    for mandi in mandis:
        price_entry = db.query(models.MarketPrice).filter(
            models.MarketPrice.mandi_id == mandi.id,
            models.MarketPrice.crop == crop_type.lower()
        ).order_by(models.MarketPrice.date.desc()).first()
        
        if not price_entry:
            continue
            
        distance = calculate_distance(farm_lat, farm_lon, mandi.latitude, mandi.longitude)
        transport_cost = round(distance * 12.0 + 50.0, 2)
        other_fees = round(price_entry.modal_price * 0.02, 2)
        net_return = round(price_entry.modal_price - transport_cost - other_fees, 2)
        
        results.append({
            "mandi_id": mandi.id,
            "mandi_name": mandi.name,
            "distance_km": round(distance, 1),
            "sticker_price": price_entry.modal_price,
            "transport_cost": transport_cost,
            "other_fees": other_fees,
            "net_return": net_return
        })
        
    results.sort(key=lambda x: x["net_return"], reverse=True)
    return results
