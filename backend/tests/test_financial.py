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
        "name": "SBI Loan Holder",
        "phone": "+917777777777",
        "password": "securepassword",
        "language": "english"
    }
    client.post("/api/v1/auth/register", json=register_data)
    
    login_data = {
        "username": "+917777777777",
        "password": "securepassword"
    }
    response = client.post("/api/v1/auth/login", data=login_data)
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_financial_obligations_and_projections(client, db_session, auth_header):
    # 1. Setup profile location, farm and wheat crop sowed 20 days ago
    client.put("/api/v1/farmers/me", json={"location_id": "Niphad_Nashik"}, headers=auth_header)
    
    farm_res = client.post("/api/v1/farmers/me/farms", json={
        "area": 3.0,
        "soil_type": "clay",
        "irrigation": "sprinkler",
        "latitude": 20.08,
        "longitude": 74.11
    }, headers=auth_header)
    farm_id = farm_res.json()["id"]
    
    sowing_date = (datetime.date.today() - datetime.timedelta(days=20)).isoformat()
    client.post(f"/api/v1/farms/{farm_id}/crops", json={
        "crop_type": "wheat",
        "variety": "Local Wheat",
        "sowing_date": sowing_date
    }, headers=auth_header)
    
    # 2. Add loan obligation of ₹40,000
    res_ob1 = client.post("/api/v1/farmers/me/obligations", json={
        "amount": 40000.0,
        "due_date": (datetime.date.today() + datetime.timedelta(days=15)).isoformat(),
        "type": "loan"
    }, headers=auth_header)
    assert res_ob1.status_code == 201
    
    # Add land lease obligation of ₹10,000
    res_ob2 = client.post("/api/v1/farmers/me/obligations", json={
        "amount": 10000.0,
        "due_date": (datetime.date.today() + datetime.timedelta(days=30)).isoformat(),
        "type": "lease"
    }, headers=auth_header)
    assert res_ob2.status_code == 201
    
    # 3. Get obligations list
    res_list = client.get("/api/v1/farmers/me/obligations", headers=auth_header)
    assert res_list.status_code == 200
    obs = res_list.json()
    assert len(obs) == 2
    
    # 4. Get Projections
    res_proj = client.get("/api/v1/farmers/me/projections", headers=auth_header)
    assert res_proj.status_code == 200
    proj = res_proj.json()
    
    # Projected wheat yield = 3.0 acres * 16.0 = 48.0 quintals
    assert proj["projected_yield_quintals"] == 48.0
    
    # Total obligations = 40,000 + 10,000 = 50,000
    assert proj["total_obligations"] == 50000.0
    
    # Projected net income = 48 * 2100 - 3 * 9000 = 100,800 - 27,000 = 73,800
    assert proj["projected_net_income"] == 73800.0
    
    # Surplus = 73,800 - 50,000 = 23,800
    assert proj["cash_flow_surplus"] == 23800.0
    assert proj["has_shortfall"] is False
