from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime

# Token Schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    phone: Optional[str] = None

# User / Farmer Schemas
class FarmerCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    phone: str = Field(..., pattern=r"^\+?[1-9]\d{1,14}$") # E.164 phone verification
    password: str = Field(..., min_length=6)
    language: Optional[str] = "english"

class FarmerLogin(BaseModel):
    username: str # matches phone number
    password: str

class FarmerUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    password: Optional[str] = None
    language: Optional[str] = None
    location_id: Optional[str] = None


class FarmerResponse(BaseModel):
    id: int
    name: str
    phone: str
    language: str
    location_id: Optional[str] = None
    risk_profile: Optional[str] = None

    class Config:
        from_attributes = True

# Crop Schemas
class CropCreate(BaseModel):
    crop_type: str
    variety: Optional[str] = None
    sowing_date: date
    expected_harvest_date: Optional[date] = None
    image_url: Optional[str] = None

class CropResponse(BaseModel):
    id: int
    farm_id: int
    crop_type: str
    variety: Optional[str]
    sowing_date: date
    stage: Optional[str]
    expected_harvest_date: Optional[date]
    image_url: Optional[str] = None

    class Config:
        from_attributes = True

# Farm Schemas
class FarmCreate(BaseModel):
    area: float = Field(..., gt=0.0) # in acres
    soil_type: str
    irrigation: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class FarmResponse(BaseModel):
    id: int
    farmer_id: int
    area: float
    soil_type: str
    irrigation: str
    latitude: Optional[float]
    longitude: Optional[float]
    crops: List[CropResponse] = []

    class Config:
        from_attributes = True

# Financial Obligation Schemas
class FinancialObligationCreate(BaseModel):
    amount: float = Field(..., gt=0.0)
    due_date: date
    type: str

class FinancialObligationResponse(BaseModel):
    id: int
    farmer_id: int
    amount: float
    due_date: date
    type: str

    class Config:
        from_attributes = True

# Distress Score & Resilience Schemas
class DistressScoreResponse(BaseModel):
    id: int
    farmer_id: int
    score: float
    weather_component: float
    market_component: float
    yield_component: float
    financial_component: float
    urgency_component: float
    risk_level: str
    created_at: datetime

    class Config:
        from_attributes = True

# Advisory & Alert Schemas
class AdvisoryResponse(BaseModel):
    id: int
    farm_id: int
    category: str
    priority: str
    recommendation: str
    reason: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

class AlertResponse(BaseModel):
    id: int
    farmer_id: int
    severity: str
    reason: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

# Recommendation Schemas
class RecommendationResponse(BaseModel):
    id: int
    farmer_id: int
    distress_score_id: int
    action_type: str
    rank: int
    confidence: float
    reason: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class RecommendationUpdate(BaseModel):
    status: str = Field(..., pattern="^(Suggested|In progress|Done|Dismissed)$")

# Scheme Schemas
class SchemeResponse(BaseModel):
    id: int
    name: str
    state: str
    conditions: str # JSON representation string
    support_type: str
    verification_url: Optional[str]

    class Config:
        from_attributes = True

# Mandi Comparison Schemas
class MandiCompareResponse(BaseModel):
    mandi_id: int
    mandi_name: str
    distance_km: float
    sticker_price: float
    transport_cost: float
    other_fees: float
    net_return: float

