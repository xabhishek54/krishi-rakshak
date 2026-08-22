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
    # Seed additional data for baseline (days 7 to 59) to have 60 days of data total
    # This is for price-crash detection and price-history tests
    from app import models
    import math
    import datetime
    crops = ["tomato", "wheat", "onion"]
    today = datetime.date.today()
    mandis = db.query(models.Mandi).all()
    base_prices = {
        "tomato": [2600.0, 2850.0, 2620.0],
        "wheat": [2100.0, 2150.0, 2080.0],
        "onion": [1800.0, 1950.0, 1850.0]
    }
    for offset in range(7, 60):
        d = today - datetime.timedelta(days=offset)
        for crop in crops:
            for i, mandi in enumerate(mandis):
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


def test_price_crash_detection(client, db_session, auth_header):
    # Setup: Add a farm so we can auth
    client.post("/api/v1/farmers/me/farms", json={
        "area": 2.0,
        "soil_type": "loam",
        "irrigation": "drip",
        "latitude": 20.08,
        "longitude": 74.11
    }, headers=auth_header)
    
    # Test price-crash detection for tomato at Nashik APMC (mandi_id=1)
    response = client.get("/api/v1/market/price-crash?crop=tomato&mandi_id=1", headers=auth_header)
    assert response.status_code == 200
    result = response.json()
    # Should have the expected keys
    assert "price_crash" in result
    assert "price_change_pct" in result
    assert "recent_7day_avg" in result
    assert "baseline_30day_avg" in result
    assert "reason" in result
    # Since we seeded with stable prices (sinusoidal variation), expect no crash
    assert isinstance(result["price_crash"], bool)
    assert isinstance(result["price_change_pct"], float)


def test_price_history(client, db_session, auth_header):
    # Setup: Add a farm so we can auth
    client.post("/api/v1/farmers/me/farms", json={
        "area": 2.0,
        "soil_type": "loam",
        "irrigation": "drip",
        "latitude": 20.08,
        "longitude": 74.11
    }, headers=auth_header)
    
    # Test price-history for tomato at Nashik APMC (mandi_id=1)
    response = client.get("/api/v1/market/price-history?crop=tomato&mandi_id=1&window=30", headers=auth_header)
    assert response.status_code == 200
    history = response.json()
    # Should be a list of price records
    assert isinstance(history, list)
    if len(history) > 0:
        first = history[0]
        assert "date" in first
        assert "min_price" in first
        assert "max_price" in first
        assert "modal_price" in first
        assert "arrivals" in first
        # Dates should be strings in ISO format
        assert isinstance(first["date"], str)
