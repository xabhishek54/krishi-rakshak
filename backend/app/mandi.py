import math
import datetime
from sqlalchemy.orm import Session
from . import models

# Seeding function for APMC Mandis and Market Prices
def seed_mandi_data(db: Session):
    # Check if mandis already exist
    if db.query(models.Mandi).first() is not None:
        return
        
    # 1. Create APMC Mandis (located in Nashik district region)
    apmc_mandis = [
        models.Mandi(name="Nashik APMC", district="Nashik", latitude=20.00, longitude=73.78),
        models.Mandi(name="Pimpalgaon APMC", district="Nashik", latitude=20.17, longitude=73.98),
        models.Mandi(name="Lasalgaon APMC", district="Nashik", latitude=20.14, longitude=74.22)
    ]
    for m in apmc_mandis:
        db.add(m)
    db.commit()
    
    # 2. Seed price data for the past 7 days (trend line simulation)
    crops = ["tomato", "wheat", "onion"]
    today = datetime.date.today()
    
    # Base prices: Mandi 0 (Nashik), Mandi 1 (Pimpalgaon), Mandi 2 (Lasalgaon)
    base_prices = {
        "tomato": [2600.0, 2850.0, 2620.0],
        "wheat": [2100.0, 2150.0, 2080.0],
        "onion": [1800.0, 1950.0, 1850.0]
    }
    
    for offset in range(7):
        d = today - datetime.timedelta(days=offset)
        for crop in crops:
            for i, mandi in enumerate(apmc_mandis):
                # Add minor price fluctuations for historical timeline
                modifier = math.sin(offset) * 50.0
                base_modal = base_prices[crop][i]
                modal = round(base_modal + modifier, 2)
                min_p = round(modal * 0.9, 2)
                max_p = round(modal * 1.1, 2)
                
                price_record = models.MarketPrice(
                    mandi_id=mandi.id,
                    crop=crop,
                    date=d,
                    min_price=min_p,
                    max_price=max_p,
                    modal_price=modal,
                    arrivals=120.0 + offset * 10
                )
                db.add(price_record)
    db.commit()

# Haversine distance formula between two GPS points
def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    # Radius of earth in kilometers
    R = 6371.0
    
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    return R * c

# Price-crash detection logic
def detect_price_crash(db: Session, crop_type: str, mandi_id: int) -> dict:
    """
    Detect if a crop's price has dropped sharply enough to matter.
    Price change = (Current 7-day avg - 30-day baseline) / 30-day baseline
    A drop around -20% or more is treated as a strong risk signal.
    """
    today = datetime.date.today()
    
    # Get current 7-day average price
    seven_days_ago = today - datetime.timedelta(days=7)
    recent_prices = db.query(models.MarketPrice).filter(
        models.MarketPrice.mandi_id == mandi_id,
        models.MarketPrice.crop == crop_type.lower(),
        models.MarketPrice.date >= seven_days_ago,
        models.MarketPrice.date <= today
    ).all()
    
    if len(recent_prices) == 0:
        return {"price_crash": False, "price_change_pct": 0.0, "reason": "Insufficient data"}
    
    recent_avg = sum(p.modal_price for p in recent_prices) / len(recent_prices)
    
    # Get 30-day baseline price (simple average of prices from 30-60 days ago)
    sixty_days_ago = today - datetime.timedelta(days=60)
    thirty_days_ago = today - datetime.timedelta(days=30)
    baseline_prices = db.query(models.MarketPrice).filter(
        models.MarketPrice.mandi_id == mandi_id,
        models.MarketPrice.crop == crop_type.lower(),
        models.MarketPrice.date >= sixty_days_ago,
        models.MarketPrice.date < thirty_days_ago
    ).all()
    
    if len(baseline_prices) == 0:
        # Fallback to using all available historical data if no 30-60 day window
        baseline_prices = db.query(models.MarketPrice).filter(
            models.MarketPrice.mandi_id == mandi_id,
            models.MarketPrice.crop == crop_type.lower(),
            models.MarketPrice.date < thirty_days_ago
        ).all()
    
    if len(baseline_prices) == 0:
        return {"price_crash": False, "price_change_pct": 0.0, "reason": "Insufficient baseline data"}
    
    baseline_avg = sum(p.modal_price for p in baseline_prices) / len(baseline_prices)
    
    # Calculate percentage change
    if baseline_avg == 0:
        price_change_pct = 0.0
    else:
        price_change_pct = ((recent_avg - baseline_avg) / baseline_avg) * 100
    
    # Price crash detected if drop is -20% or more
    price_crash = price_change_pct <= -20.0
    
    return {
        "price_crash": price_crash,
        "price_change_pct": round(price_change_pct, 2),
        "recent_7day_avg": round(recent_avg, 2),
        "baseline_30day_avg": round(baseline_avg, 2),
        "reason": f"Price changed {price_change_pct:.2f}% vs 30-day baseline"
    }

# Price history logic
def get_price_history(db: Session, crop_type: str, mandi_id: int, window_days: int = 30) -> list:
    """
    Get historical price data for a crop at a mandi over a specified window.
    Returns list of {date, min_price, max_price, modal_price} dicts ordered by date.
    """
    today = datetime.date.today()
    start_date = today - datetime.timedelta(days=window_days)
    
    prices = db.query(models.MarketPrice).filter(
        models.MarketPrice.mandi_id == mandi_id,
        models.MarketPrice.crop == crop_type.lower(),
        models.MarketPrice.date >= start_date,
        models.MarketPrice.date <= today
    ).order_by(models.MarketPrice.date.asc()).all()
    
    return [{
        "date": p.date.isoformat(),
        "min_price": p.min_price,
        "max_price": p.max_price,
        "modal_price": p.modal_price,
        "arrivals": p.arrivals
    } for p in prices]

# Mandi comparison logic
def get_mandi_comparison(db: Session, crop_type: str, farm_lat: float, farm_lon: float):
    # Find latest prices for the requested crop
    today = datetime.date.today()
    
    mandis = db.query(models.Mandi).all()
    results = []
    
    for mandi in mandis:
        # Get most recent price entry
        price_entry = db.query(models.MarketPrice).filter(
            models.MarketPrice.mandi_id == mandi.id,
            models.MarketPrice.crop == crop_type.lower()
        ).order_by(models.MarketPrice.date.desc()).first()
        
        if not price_entry:
            continue
            
        distance = calculate_distance(farm_lat, farm_lon, mandi.latitude, mandi.longitude)
        
        # Transportation charge: ₹12 per km flat + ₹50 loading charge per quintal
        transport_cost = round(distance * 12.0 + 50.0, 2)
        
        # Handling & mandi commission (e.g. 2%)
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
        
    # Sort by net returns (descending)
    results.sort(key=lambda x: x["net_return"], reverse=True)
    return results
