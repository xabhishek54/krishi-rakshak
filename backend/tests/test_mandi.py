import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app import models
from app.mandi import seed_mandi_data

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}, poolclass=StaticPool)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="module")
def db_session():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    # Seed APMC Mandis and prices
    seed_mandi_data(db)
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
        "name": "Mandi Trader",
        "phone": "+919999999999",
        "password": "securepassword",
        "language": "english"
    }
    client.post("/api/v1/auth/register", json=register_data)
    
    login_data = {
        "username": "+919999999999",
        "password": "securepassword"
    }
    response = client.post("/api/v1/auth/login", data=login_data)
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_compare_mandis(client, db_session, auth_header):
    # 1. Add farm at Niphad coordinates (lat: 20.08, lon: 74.11)
    farm_res = client.post("/api/v1/farmers/me/farms", json={
        "area": 5.0,
        "soil_type": "loam",
        "irrigation": "drip",
        "latitude": 20.08,
        "longitude": 74.11
    }, headers=auth_header)
    assert farm_res.status_code == 201
    
    # 2. Get comparison list for tomato
    response = client.get("/api/v1/mandis/compare?crop=tomato", headers=auth_header)
    assert response.status_code == 200
    comparison = response.json()
    
    # Verify that all 3 seeded mandis are evaluated
    assert len(comparison) == 3
    
    # Check shape of response parameters
    first = comparison[0]
    assert "mandi_name" in first
    assert "distance_km" in first
    assert "sticker_price" in first
    assert "transport_cost" in first
    assert "other_fees" in first
    assert "net_return" in first
    
    # Confirm that list is sorted by net_return descending
    assert comparison[0]["net_return"] >= comparison[1]["net_return"]
    assert comparison[1]["net_return"] >= comparison[2]["net_return"]
