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
    state: Optional[str] = None
    district: Optional[str] = None
    name: Optional[str] = None  # user-defined farm name

class FarmResponse(BaseModel):
    id: int
    farmer_id: int
    area: float
    soil_type: str
    irrigation: str
    latitude: Optional[float]
    longitude: Optional[float]
    state: Optional[str] = None
    district: Optional[str] = None
    name: Optional[str] = None
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
    crop_name: Optional[str] = None
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
    relevance_score: float = 0.0      # 0-100, higher = more relevant to this farmer
    is_recommended: bool = False      # True if top-ranked by distress+crop context
    category: str = "scheme"          # "scheme" or "loan"
    why_recommended: Optional[str] = None
    benefit_summary: Optional[str] = None

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

# Price Crash Schema
class PriceCrashResponse(BaseModel):
    price_crash: bool
    price_change_pct: float
    recent_7day_avg: Optional[float] = None
    baseline_30day_avg: Optional[float] = None
    reason: str

# Price History Schema
class PriceHistoryResponse(BaseModel):
    date: str
    min_price: float
    max_price: float
    modal_price: float
    arrivals: float

# Financial Schemas
class FinancialObligationCreate(BaseModel):
    amount: float = Field(..., gt=0.0)
    due_date: date
    type: str = Field(..., pattern="^(loan|lease|inputs|other)$")

class FinancialObligationResponse(BaseModel):
    id: int
    farmer_id: int
    amount: float
    due_date: date
    type: str

    class Config:
        from_attributes = True

class CashFlowResponse(BaseModel):
    projected_yield_quintals: float
    expected_price_per_quintal: float
    projected_revenue: float
    cultivation_cost: float
    projected_net_income: float
    total_obligations: float
    cash_flow_surplus: float
    has_shortfall: bool
    obligations: List[FinancialObligationResponse]

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


# Agro Officer Schemas
class AgroOfficerCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    phone: str = Field(..., pattern=r"^\+?[1-9]\d{1,14}$")
    email: Optional[str] = None
    password: str = Field(..., min_length=6)
    designation: str = Field(..., min_length=2)
    state: str
    district: str
    municipality: str
    ward: Optional[str] = None

class AgroOfficerResponse(BaseModel):
    id: int
    name: str
    phone: str
    email: Optional[str] = None
    designation: str
    state: str
    district: str
    municipality: str
    ward: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class OfficerInterventionUpdate(BaseModel):
    status: str = Field(..., pattern="^(Pending|Reviewed|Contacted|Assistance Provided|Resolved)$")
    notes: Optional[str] = None

class OfficerInterventionResponse(BaseModel):
    id: int
    farmer_id: int
    officer_id: int
    status: str
    notes: Optional[str] = None
    updated_at: datetime

    class Config:
        from_attributes = True

class CreditAssessmentRequest(BaseModel):
    loan_requested: float
    has_cold_storage: int = 0
    uses_precision_tech: int = 0
    sells_stubble: int = 0
    does_sorting: int = 0


class CreditAssessmentResponse(BaseModel):
    id: Optional[int] = None
    farmer_id: int
    score_label: str = "Credit Score"
    credit_score: int
    repay_probability: float
    status: str
    loan_requested: float
    approved_amount: float
    land_acres: float
    has_cold_storage: int
    uses_precision_tech: int
    sells_stubble: int
    does_sorting: int
    reason_codes: List[str] = []
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class OfficerLocalityFarmerSummary(BaseModel):
    farmer_id: int
    name: str
    phone: str
    language: str
    location_id: Optional[str] = None
    distress_score: float
    distress_level: str # Stable, Watch, Elevated, High, Critical
    farms_count: int
    total_acreage: float
    active_crops: List[str]
    total_debt: float
    credit_score: Optional[int] = None
    credit_status: Optional[str] = None
    approved_loan_amount: Optional[float] = None
    intervention_status: str # Pending | Reviewed | Contacted | Assistance Provided | Resolved
    intervention_notes: Optional[str] = None
    last_updated: Optional[str] = None

class OfficerFarmerDetailResponse(BaseModel):
    farmer_id: int
    name: str
    phone: str
    language: str
    location_id: Optional[str] = None
    distress_score: Optional[DistressScoreResponse] = None
    farms: List[FarmResponse] = []
    financial_obligations: List[FinancialObligationResponse] = []
    alerts: List[AlertResponse] = []
    advisories: List[AdvisoryResponse] = []
    intervention: Optional[OfficerInterventionResponse] = None
    latest_credit: Optional[CreditAssessmentResponse] = None

class LocalityMapPoint(BaseModel):
    farm_id: int
    farm_name: str
    farmer_id: int
    farmer_name: str
    farmer_phone: str
    latitude: float
    longitude: float
    district: str
    distress_score: float
    distress_level: str
    crop_type: Optional[str] = None
    acreage: float


class OfficerSchemeRecommendCreate(BaseModel):
    scheme_id: Optional[int] = None
    scheme_name: str
    scheme_type: str = "scheme"   # 'scheme' | 'loan'
    notes: Optional[str] = None


class OfficerSchemeRecommendResponse(BaseModel):
    id: int
    farmer_id: int
    officer_id: int
    scheme_id: Optional[int] = None
    scheme_name: str
    scheme_type: str
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
