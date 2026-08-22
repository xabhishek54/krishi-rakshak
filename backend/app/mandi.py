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
        ).order_index = models.MarketPrice.date.desc()
        
        # If no price exists for today, fallback to latest entry
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
