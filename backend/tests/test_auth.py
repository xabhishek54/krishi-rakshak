import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool
from sqlalchemy.orm import sessionmaker
from app.database import Base, get_db
from app.main import app
from app import models

# Setup a clean in-memory SQLite database for testing with StaticPool
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
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

def test_read_root(client):
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "running"

def test_register_farmer(client):
    register_data = {
        "name": "Test Farmer",
        "phone": "+919876543210",
        "password": "securepassword",
        "language": "marathi"
    }
    response = client.post("/api/v1/auth/register", json=register_data)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Test Farmer"
    assert data["phone"] == "+919876543210"
    assert data["language"] == "marathi"
    assert "id" in data
    assert "hashed_password" not in data

def test_register_farmer_duplicate(client):
    register_data = {
        "name": "Duplicate Farmer",
        "phone": "+919876543210",
        "password": "anotherpassword",
        "language": "english"
    }
    response = client.post("/api/v1/auth/register", json=register_data)
    assert response.status_code == 400
    assert response.json()["detail"] == "Phone number already registered"

def test_login_farmer(client):
    # Success Login
    login_data = {
        "username": "+919876543210",
        "password": "securepassword"
    }
    response = client.post("/api/v1/auth/login", data=login_data)
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

    # Failed Login
    bad_login_data = {
        "username": "+919876543210",
        "password": "wrongpassword"
    }
    response = client.post("/api/v1/auth/login", data=bad_login_data)
    assert response.status_code == 401

def test_get_me(client):
    # Login to get token
    login_data = {
        "username": "+919876543210",
        "password": "securepassword"
    }
    response = client.post("/api/v1/auth/login", data=login_data)
    token = response.json()["access_token"]

    # Call get_me with header
    headers = {"Authorization": f"Bearer {token}"}
    response = client.get("/api/v1/farmers/me", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Test Farmer"
    assert data["phone"] == "+919876543210"

    # Call get_me without headers
    response = client.get("/api/v1/farmers/me")
    assert response.status_code == 401
