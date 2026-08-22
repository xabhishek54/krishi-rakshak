import pytest
import datetime
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app import models, main

# Setup testing db
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}, poolclass=StaticPool)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Mock Weather Provider
class MockWeatherProvider:
    async def fetch_weather(self, lat: float, lon: float):
        return {
            "observation": {
                "rainfall": 12.5,
                "temperature": 27.0,
                "humidity": 65.0
            },
            "forecast": [
                {
                    "date": datetime.date.today(),
                    "rainfall_forecast": 5.0,
                    "temperature": 28.0,
                    "rain_probability": 25.0
                },
                {
                    "date": datetime.date.today() + datetime.timedelta(days=1),
                    "rainfall_forecast": 40.0,
                    "temperature": 23.5,
                    "rain_probability": 85.0
                }
            ]
        }

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
    main.weather_provider = MockWeatherProvider()
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()

@pytest.fixture(scope="module")
def auth_header(client):
    # Register and login a test farmer
    register_data = {
        "name": "Ramesh Tomato",
        "phone": "+919999999999",
        "password": "securepassword",
        "language": "marathi"
    }
    client.post("/api/v1/auth/register", json=register_data)
    
    login_data = {
        "username": "+919999999999",
        "password": "securepassword"
    }
    response = client.post("/api/v1/auth/login", data=login_data)
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_update_profile(client, auth_header):
    update_data = {
        "name": "Ramesh Kumar Nashik",
        "location_id": "Niphad_Block_01"
    }
    response = client.put("/api/v1/farmers/me", json=update_data, headers=auth_header)
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Ramesh Kumar Nashik"
    assert data["location_id"] == "Niphad_Block_01"

def test_create_and_list_farm(client, auth_header):
    farm_data = {
        "area": 2.5,
        "soil_type": "loam",
        "irrigation": "drip",
        "latitude": 20.08,
        "longitude": 74.11
    }
    # Create farm
    response = client.post("/api/v1/farmers/me/farms", json=farm_data, headers=auth_header)
    assert response.status_code == 201
    data = response.json()
    assert data["area"] == 2.5
    assert data["soil_type"] == "loam"
    assert data["latitude"] == 20.08
    farm_id = data["id"]
    
    # List farms
    response = client.get("/api/v1/farmers/me/farms", headers=auth_header)
    assert response.status_code == 200
    farms_list = response.json()
    assert len(farms_list) == 1
    assert farms_list[0]["id"] == farm_id

def test_create_crop_and_stage_derivation(client, auth_header):
    # Fetch farm id
    response = client.get("/api/v1/farmers/me/farms", headers=auth_header)
    farm_id = response.json()[0]["id"]
    
    # Crop sowed 45 days ago (should resolve to Flowering or Fruit Development stage)
    sowing_date = (datetime.date.today() - datetime.timedelta(days=45)).isoformat()
    crop_data = {
        "crop_type": "tomato",
        "variety": "Nashik Local",
        "sowing_date": sowing_date
    }
    
    response = client.post(f"/api/v1/farms/{farm_id}/crops", json=crop_data, headers=auth_header)
    assert response.status_code == 201
    data = response.json()
    assert data["crop_type"] == "tomato"
    assert data["stage"] == "Flowering"
    
    # Verify GET crops list calculates stage
    response = client.get(f"/api/v1/farms/{farm_id}/crops", headers=auth_header)
    assert response.status_code == 200
    crops = response.json()
    assert len(crops) == 1
    assert crops[0]["stage"] == "Flowering"

def test_weather_sync_and_retrieve(client, auth_header):
    location_id = "Niphad_Block_01"
    
    # Trigger refresh
    response = client.post(f"/api/v1/weather/{location_id}/refresh", headers=auth_header)
    assert response.status_code == 200
    assert response.json()["status"] == "success"
    
    # Query cached weather
    response = client.get(f"/api/v1/weather/{location_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["location_id"] == location_id
    assert data["observation"]["rainfall"] == 12.5
    assert len(data["forecasts"]) == 2
    assert data["forecasts"][1]["rainfall_forecast"] == 40.0
