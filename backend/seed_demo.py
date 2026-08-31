"""
Demo account seeder for KrishiRakshak.
Direct SQLite seeder (SQLAlchemy).
"""

import sys 
import os
from datetime import date, timedelta
from sqlalchemy.orm import Session

# Add parent directory to path to allow importing app modules
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, get_db
from app import models, auth
from app.advisory import evaluate_advisories

DEMO_PHONE = "+919876543210"
DEMO_PASSWORD = "demo1234"
DEMO_NAME = "Ramesh Patil"

DEMO_OFFICER_PHONE = "+919988776655"
DEMO_OFFICER_PASSWORD = "officer123"
DEMO_OFFICER_NAME = "Dr. Aniket Deshmukh"

def seed_officer_data(db: Session):
    officer = db.query(models.AgroOfficer).filter(models.AgroOfficer.phone == DEMO_OFFICER_PHONE).first()
    if not officer:
        hashed = auth.get_password_hash(DEMO_OFFICER_PASSWORD)
        officer = models.AgroOfficer(
            name=DEMO_OFFICER_NAME,
            phone=DEMO_OFFICER_PHONE,
            email="aniket.deshmukh@krishi.gov.in",
            hashed_password=hashed,
            designation="Senior Block Agricultural Officer",
            state="Maharashtra",
            district="Nashik",
            municipality="Niphad Block",
            ward="Ward #4"
        )
        db.add(officer)
        db.commit()
        db.refresh(officer)
        print(f"[seeder] Created demo Agro Officer: {DEMO_OFFICER_NAME} (id={officer.id})")

def seed_farmer_data(db: Session):
    """Direct database seeding logic using SQLAlchemy."""
    # 1. Clear old data for the farmer if they exist
    farmer = db.query(models.Farmer).filter(models.Farmer.phone == DEMO_PHONE).first()
    if not farmer:
        # Create farmer
        hashed = auth.get_password_hash(DEMO_PASSWORD)
        farmer = models.Farmer(
            name=DEMO_NAME,
            phone=DEMO_PHONE,
            hashed_password=hashed,
            language="marathi",
            location_id="Nashik_Maharashtra",
            risk_profile="Elevated"
        )
        db.add(farmer)
        db.commit()
        db.refresh(farmer)
        print(f"[seeder] Created demo farmer: {DEMO_NAME} (id={farmer.id})")
    else:
        # Clear existing associations
        for farm in db.query(models.Farm).filter(models.Farm.farmer_id == farmer.id).all():
            db.query(models.Advisory).filter(models.Advisory.farm_id == farm.id).delete()
            db.query(models.Crop).filter(models.Crop.farm_id == farm.id).delete()
        db.query(models.Alert).filter(models.Alert.farmer_id == farmer.id).delete()
        db.query(models.FinancialObligation).filter(models.FinancialObligation.farmer_id == farmer.id).delete()
        db.query(models.DistressScore).filter(models.DistressScore.farmer_id == farmer.id).delete()
        db.query(models.Farm).filter(models.Farm.farmer_id == farmer.id).delete()
        db.commit()
        print(f"[seeder] Cleared old data for farmer id={farmer.id}")

    # Update basic profile
    farmer.language = "marathi"
    farmer.location_id = "Nashik_Maharashtra"
    farmer.risk_profile = "Elevated"

    # 2. Add 5 Farms in different locations
    farms_data = [
        {
            "name": "Nashik Main Farm",
            "area": 4.5,
            "soil_type": "loam",
            "irrigation": "drip",
            "latitude": 20.0059,
            "longitude": 73.7898,
            "state": "Maharashtra",
            "district": "Nashik",
        },
        {
            "name": "Pimpalgaon Plot",
            "area": 3.0,
            "soil_type": "black",
            "irrigation": "sprinkler",
            "latitude": 20.1234,
            "longitude": 74.0987,
            "state": "Maharashtra",
            "district": "Nashik",
        },
        {
            "name": "Jalgaon Banana Orchard",
            "area": 5.5,
            "soil_type": "clay",
            "irrigation": "flood",
            "latitude": 21.0077,
            "longitude": 75.5626,
            "state": "Maharashtra",
            "district": "Jalgaon",
        },
        {
            "name": "Nagpur Cotton Field",
            "area": 6.0,
            "soil_type": "black",
            "irrigation": "rainfed",
            "latitude": 21.1458,
            "longitude": 79.0882,
            "state": "Maharashtra",
            "district": "Nagpur",
        },
        {
            "name": "Pune Vegetable Garden",
            "area": 2.5,
            "soil_type": "sandy",
            "irrigation": "drip",
            "latitude": 18.5204,
            "longitude": 73.8567,
            "state": "Maharashtra",
            "district": "Pune",
        }
    ]

    farms = []
    for fd in farms_data:
        f = models.Farm(farmer_id=farmer.id, **fd)
        db.add(f)
        farms.append(f)
    db.commit()
    for f in farms:
        db.refresh(f)
    print(f"[seeder] Seeded 5 farms.")

    # 3. Add 6 Crops (including duplicates of crops to test grouping, e.g. Tomato on Farm 1 and Farm 5)
    today = date.today()
    crops_data = [
        {
            "farm_index": 0, # Nashik Main Farm
            "crop_type": "tomato",
            "variety": "Namdhari NS-585",
            "sowing_date": today - timedelta(days=52),
            "stage": "Fruit Development",
            "expected_harvest_date": today + timedelta(days=28),
            "image_url": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop",
        },
        {
            "farm_index": 0, # Nashik Main Farm
            "crop_type": "onion",
            "variety": "Nasik Red",
            "sowing_date": today - timedelta(days=35),
            "stage": "Vegetative Growth",
            "expected_harvest_date": today + timedelta(days=60),
            "image_url": "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=600&auto=format&fit=crop",
        },
        {
            "farm_index": 1, # Pimpalgaon Plot
            "crop_type": "wheat",
            "variety": "HD-2967",
            "sowing_date": today - timedelta(days=20),
            "stage": "Tillering",
            "expected_harvest_date": today + timedelta(days=100),
            "image_url": "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=600&auto=format&fit=crop",
        },
        {
            "farm_index": 2, # Jalgaon Orchard
            "crop_type": "grapes",
            "variety": "Thompson Seedless",
            "sowing_date": today - timedelta(days=120),
            "stage": "Maturity",
            "expected_harvest_date": today + timedelta(days=10),
            "image_url": "https://images.unsplash.com/photo-1537640538966-79f369143f8f?w=600&auto=format&fit=crop",
        },
        {
            "farm_index": 3, # Nagpur cotton
            "crop_type": "cotton",
            "variety": "BT Cotton",
            "sowing_date": today - timedelta(days=75),
            "stage": "Fruit Development",
            "expected_harvest_date": today + timedelta(days=40),
            "image_url": "https://images.unsplash.com/photo-1594900051184-a157f49b1ca2?w=600&auto=format&fit=crop",
        },
        {
            "farm_index": 4, # Pune Vegetable Garden
            "crop_type": "tomato",
            "variety": "Abhinav",
            "sowing_date": today - timedelta(days=10),
            "stage": "Germination",
            "expected_harvest_date": today + timedelta(days=90),
            "image_url": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop",
        }
    ]

    for cd in crops_data:
        f_idx = cd.pop("farm_index")
        c = models.Crop(farm_id=farms[f_idx].id, **cd)
        db.add(c)
    db.commit()
    print(f"[seeder] Seeded 6 crops (with duplicate Tomato for grouping tests).")

    # 4. Add 4 Financial Obligations
    obs_data = [
        {"amount": 45000.0, "due_date": today + timedelta(days=18), "type": "loan"},
        {"amount": 12000.0, "due_date": today + timedelta(days=5),  "type": "inputs"},
        {"amount": 15000.0, "due_date": today + timedelta(days=25), "type": "lease"},
        {"amount": 6000.0,  "due_date": today + timedelta(days=3),  "type": "inputs"},
    ]

    for od in obs_data:
        ob = models.FinancialObligation(farmer_id=farmer.id, **od)
        db.add(ob)
    db.commit()
    print(f"[seeder] Seeded 4 financial obligations.")

    # 5. Seed some basic mock weather for these locations so dashboard loads immediately
    # Nashik
    db.merge(models.WeatherObservation(location_id="Nashik_Maharashtra", date=today, rainfall=5.0, temperature=27.0, humidity=82.0, wind_speed=14.0))
    # Jalgaon
    db.merge(models.WeatherObservation(location_id="Jalgaon_Maharashtra", date=today, rainfall=12.0, temperature=31.0, humidity=75.0, wind_speed=18.0))
    # Nagpur
    db.merge(models.WeatherObservation(location_id="Nagpur_Maharashtra", date=today, rainfall=2.0, temperature=30.0, humidity=70.0, wind_speed=10.0))
    # Pune
    db.merge(models.WeatherObservation(location_id="Pune_Maharashtra", date=today, rainfall=0.0, temperature=28.0, humidity=68.0, wind_speed=8.0))
    db.commit()

    # 6. Trigger advisory generation
    evaluate_advisories(db, farmer)
    print(f"[seeder] Triggered real-time advisories generation.")

if __name__ == "__main__":
    from app.database import engine
    models.Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_farmer_data(db)
        seed_officer_data(db)
        print("Demo farmer and Agro Officer seeding complete!")
    finally:
        db.close()
