import pytest
import datetime
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app import models

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}, poolclass=StaticPool)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="module")
def db_session():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="module")
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()

@pytest.fixture(scope="module")
def auth_header(client):
    # Register and login test farmer
    register_data = {
        "name": "Sanjay Tomato",
        "phone": "+918888888888",
        "password": "securepassword",
        "language": "english"
      }
    client.post("/api/v1/auth/register", json=register_data)
    
    login_data = {
        "username": "+918888888888",
        "password": "securepassword"
    }
    response = client.post("/api/v1/auth/login", data=login_data)
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_evaluate_rules_and_fetch(client, db_session, auth_header):
    # 1. Update farmer profile location
    client.put("/api/v1/farmers/me", json={"location_id": "Niphad_Nashik"}, headers=auth_header)
    
    # 2. Add farm
    farm_res = client.post("/api/v1/farmers/me/farms", json={
        "area": 3.0,
        "soil_type": "loam",
        "irrigation": "drip",
        "latitude": 20.08,
        "longitude": 74.11
    }, headers=auth_header)
    farm_id = farm_res.json()["id"]
    
    # 3. Add Tomato crop sown 50 days ago (fruit development stage)
    sowing_date_1 = (datetime.date.today() - datetime.timedelta(days=50)).isoformat()
    client.post(f"/api/v1/farms/{farm_id}/crops", json={
        "crop_type": "tomato",
        "variety": "Local A",
        "sowing_date": sowing_date_1
    }, headers=auth_header)
    
    # Add another Tomato crop sown 30 days ago (flowering stage)
    sowing_date_2 = (datetime.date.today() - datetime.timedelta(days=30)).isoformat()
    client.post(f"/api/v1/farms/{farm_id}/crops", json={
        "crop_type": "tomato",
        "variety": "Local B",
        "sowing_date": sowing_date_2
    }, headers=auth_header)
    
    # 4. Seed Weather forecast for today/tomorrow (heavy rain forecast = 35mm)
    today = datetime.date.today()
    tomorrow = today + datetime.timedelta(days=1)
    
    forecast_today = models.WeatherForecast(
        location_id="Niphad_Nashik",
        date=today,
        rainfall_forecast=35.0,
        temperature=24.0,
        rain_probability=85.0
    )
    forecast_tomorrow = models.WeatherForecast(
        location_id="Niphad_Nashik",
        date=tomorrow,
        rainfall_forecast=40.0,
        temperature=25.0,
        rain_probability=90.0
    )
    db_session.add(forecast_today)
    db_session.add(forecast_tomorrow)
    
    # Seed Weather observations for pest warning (humidity > 80% for 3 days: today, yesterday, 2 days ago)
    for offset in range(3):
        d = today - datetime.timedelta(days=offset)
        obs = models.WeatherObservation(
            location_id="Niphad_Nashik",
            date=d,
            rainfall=0.0,
            temperature=20.0, # maps between 15 and 25
            humidity=85.0     # exceeds 80
        )
        db_session.add(obs)
        
    db_session.commit()
    
    # 5. Fetch Advisories
    response = client.get("/api/v1/advisories", headers=auth_header)
    assert response.status_code == 200
    advisories = response.json()
    assert len(advisories) >= 1
    
    # Check that "Stop Tomato Irrigation" is generated
    tomato_adv = [a for a in advisories if a["recommendation"] == "Stop Tomato Irrigation"]
    assert len(tomato_adv) == 1
    assert tomato_adv[0]["category"] == "irrigation"
    assert tomato_adv[0]["priority"] == "high"
    
    # 6. Fetch Alerts
    response = client.get("/api/v1/alerts", headers=auth_header)
    assert response.status_code == 200
    alerts = response.json()
    assert len(alerts) >= 1
    
    # Check that Late Blight warning exists (can be multiple for multi-stage crops)
    blight_alert = [al for al in alerts if "Late Blight" in al["reason"]]
    assert len(blight_alert) >= 1
    assert all(al["severity"] == "Critical" for al in blight_alert)
