import datetime
from sqlalchemy import Column, Integer, String, Float, Date, DateTime, ForeignKey, Text, Index
from sqlalchemy.orm import relationship
from app.database import Base

class Farmer(Base):
    __tablename__ = "farmers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    phone = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    language = Column(String, default="english") # english, hindi, odia, bengali, marathi
    location_id = Column(String, nullable=True) # village/block identifier or code
    risk_profile = Column(String, nullable=True) # latest distress risk category/score summary

        # Relationships
    farms = relationship("Farm", back_populates="farmer", cascade="all, delete-orphan")
    financial_obligations = relationship("FinancialObligation", back_populates="farmer", cascade="all, delete-orphan")
    distress_scores = relationship("DistressScore", back_populates="farmer", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="farmer", cascade="all, delete-orphan")
    recommendations = relationship("Recommendation", back_populates="farmer", cascade="all, delete-orphan")

class Farm(Base):
    __tablename__ = "farms"

    id = Column(Integer, primary_key=True, index=True)
    farmer_id = Column(Integer, ForeignKey("farmers.id", ondelete="CASCADE"), nullable=False)
    area = Column(Float, nullable=False) # In acres
    soil_type = Column(String, nullable=False) # loam, clay, sandy, black_cotton, etc.
    irrigation = Column(String, nullable=False) # drip, sprinkler, flood, rainfed
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    state = Column(String, nullable=True)
    district = Column(String, nullable=True)
    name = Column(String, nullable=True)  # user-defined farm name

    # Relationships
    farmer = relationship("Farmer", back_populates="farms")
    crops = relationship("Crop", back_populates="farm", cascade="all, delete-orphan")
    projections = relationship("FarmProjection", back_populates="farm", cascade="all, delete-orphan")
    resilience_scores = relationship("ResilienceScore", back_populates="farm", cascade="all, delete-orphan")
    advisories = relationship("Advisory", back_populates="farm", cascade="all, delete-orphan")

class Crop(Base):
    __tablename__ = "crops"

    id = Column(Integer, primary_key=True, index=True)
    farm_id = Column(Integer, ForeignKey("farms.id", ondelete="CASCADE"), nullable=False)
    crop_type = Column(String, nullable=False) # tomato, wheat, onion, etc.
    variety = Column(String, nullable=True)
    sowing_date = Column(Date, nullable=False)
    stage = Column(String, nullable=True) # vegetative, flowering, fruit_development, maturity (derived)
    expected_harvest_date = Column(Date, nullable=True)
    image_url = Column(String, nullable=True)

    # Relationships
    farm = relationship("Farm", back_populates="crops")

class WeatherObservation(Base):
    __tablename__ = "weather_observations"

    id = Column(Integer, primary_key=True, index=True)
    location_id = Column(String, index=True, nullable=False)
    date = Column(Date, nullable=False)
    rainfall = Column(Float, default=0.0) # In mm
    temperature = Column(Float, nullable=True) # In C
    humidity = Column(Float, nullable=True) # In %
    wind_speed = Column(Float, default=12.0) # In km/h

class WeatherForecast(Base):
    __tablename__ = "weather_forecasts"

    id = Column(Integer, primary_key=True, index=True)
    location_id = Column(String, index=True, nullable=False)
    date = Column(Date, nullable=False)
    rainfall_forecast = Column(Float, default=0.0) # In mm
    temperature = Column(Float, nullable=True)
    rain_probability = Column(Float, default=0.0) # In %

class Mandi(Base):
    __tablename__ = "mandis"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    district = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)

    # Relationships
    prices = relationship("MarketPrice", back_populates="mandi", cascade="all, delete-orphan")

class MarketPrice(Base):
    __tablename__ = "market_prices"
    __table_args__ = (
        Index("ix_market_prices_crop_date", "crop", "date"),
    )

    id = Column(Integer, primary_key=True, index=True)
    mandi_id = Column(Integer, ForeignKey("mandis.id", ondelete="CASCADE"), nullable=False)
    crop = Column(String, nullable=False)
    date = Column(Date, nullable=False)
    min_price = Column(Float, nullable=False)
    max_price = Column(Float, nullable=False)
    modal_price = Column(Float, nullable=False)
    arrivals = Column(Float, default=0.0)
    source = Column(String, default="seeded")  # 'seeded' | 'agmarknet_live'

    # Relationships
    mandi = relationship("Mandi", back_populates="prices")

class FinancialObligation(Base):
    __tablename__ = "financial_obligations"

    id = Column(Integer, primary_key=True, index=True)
    farmer_id = Column(Integer, ForeignKey("farmers.id", ondelete="CASCADE"), nullable=False)
    amount = Column(Float, nullable=False)
    due_date = Column(Date, nullable=False)
    type = Column(String, nullable=False) # loan, lease, inputs, etc.

    # Relationships
    farmer = relationship("Farmer", back_populates="financial_obligations")

class FarmProjection(Base):
    __tablename__ = "farm_projections"

    id = Column(Integer, primary_key=True, index=True)
    farm_id = Column(Integer, ForeignKey("farms.id", ondelete="CASCADE"), nullable=False)
    scenario = Column(String, nullable=False) # normal, current, stress
    yield_val = Column(Float, nullable=False) # projected yield (using yield_val to avoid python keyword)
    price = Column(Float, nullable=False)
    revenue = Column(Float, nullable=False)
    cost = Column(Float, nullable=False)
    net_income = Column(Float, nullable=False)

    # Relationships
    farm = relationship("Farm", back_populates="projections")

class ResilienceScore(Base):
    __tablename__ = "resilience_scores"

    id = Column(Integer, primary_key=True, index=True)
    farm_id = Column(Integer, ForeignKey("farms.id", ondelete="CASCADE"), nullable=False)
    coverage_ratio = Column(Float, nullable=False)
    score = Column(Float, nullable=False)
    scenario = Column(String, nullable=False) # normal, current, stress

    # Relationships
    farm = relationship("Farm", back_populates="resilience_scores")

class DistressScore(Base):
    __tablename__ = "distress_scores"

    id = Column(Integer, primary_key=True, index=True)
    farmer_id = Column(Integer, ForeignKey("farmers.id", ondelete="CASCADE"), nullable=False)
    score = Column(Float, nullable=False) # 0 to 100
    weather_component = Column(Float, nullable=False)
    market_component = Column(Float, nullable=False)
    yield_component = Column(Float, nullable=False)
    financial_component = Column(Float, nullable=False)
    urgency_component = Column(Float, nullable=False)
    risk_level = Column(String, nullable=False) # Stable, Watch, Elevated, High, Critical
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    farmer = relationship("Farmer", back_populates="distress_scores")
    recommendations = relationship("Recommendation", back_populates="distress_score", cascade="all, delete-orphan")

class Advisory(Base):
    __tablename__ = "advisories"

    id = Column(Integer, primary_key=True, index=True)
    farm_id = Column(Integer, ForeignKey("farms.id", ondelete="CASCADE"), nullable=False)
    crop_name = Column(String, nullable=True) # Crop type (e.g. Tomato, Onion, Wheat)
    category = Column(String, nullable=False) # weather, irrigation, pests, etc.
    priority = Column(String, default="medium") # low, medium, high
    recommendation = Column(Text, nullable=False) # Localized message
    reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    farm = relationship("Farm", back_populates="advisories")

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    farmer_id = Column(Integer, ForeignKey("farmers.id", ondelete="CASCADE"), nullable=False)
    severity = Column(String, nullable=False) # Stable, Watch, Elevated, High, Critical
    reason = Column(Text, nullable=False)
    status = Column(String, default="open") # open, acknowledged, closed
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    farmer = relationship("Farmer", back_populates="alerts")

class Recommendation(Base):
    __tablename__ = "recommendations"

    id = Column(Integer, primary_key=True, index=True)
    farmer_id = Column(Integer, ForeignKey("farmers.id", ondelete="CASCADE"), nullable=False)
    distress_score_id = Column(Integer, ForeignKey("distress_scores.id", ondelete="CASCADE"), nullable=False)
    action_type = Column(String, nullable=False) # crop_insurance, alternate_mandi, etc.
    rank = Column(Integer, nullable=False)
    confidence = Column(Float, nullable=False)
    reason = Column(Text, nullable=False)
    status = Column(String, default="Suggested") # Suggested, In progress, Done, Dismissed
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    farmer = relationship("Farmer", back_populates="recommendations")
    distress_score = relationship("DistressScore", back_populates="recommendations")

class Scheme(Base):
    __tablename__ = "schemes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    state = Column(String, nullable=False) # Applicable state (or All)
    conditions = Column(Text, nullable=False) # JSON string representation of eligibility
    support_type = Column(String, nullable=False) # subsidy, compensation, loan_relief
    verification_url = Column(String, nullable=True)

class AgroOfficer(Base):
    __tablename__ = "agro_officers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    phone = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, nullable=True)
    hashed_password = Column(String, nullable=False)
    designation = Column(String, nullable=False) # e.g., Block Agricultural Officer, District Extension Officer
    state = Column(String, nullable=False)       # e.g., Maharashtra
    district = Column(String, nullable=False)    # e.g., Nashik
    municipality = Column(String, nullable=False)# e.g., Niphad / Pimpalgaon
    ward = Column(String, nullable=True)        # Optional ward
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    interventions = relationship("OfficerIntervention", back_populates="officer", cascade="all, delete-orphan")
    scheme_recommendations = relationship("OfficerSchemeRecommendation", back_populates="officer", cascade="all, delete-orphan")

class OfficerIntervention(Base):
    __tablename__ = "officer_interventions"

    id = Column(Integer, primary_key=True, index=True)
    farmer_id = Column(Integer, ForeignKey("farmers.id", ondelete="CASCADE"), nullable=False)
    officer_id = Column(Integer, ForeignKey("agro_officers.id", ondelete="CASCADE"), nullable=False)
    status = Column(String, default="Pending") # Pending | Reviewed | Contacted | Assistance Provided | Resolved
    notes = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    officer = relationship("AgroOfficer", back_populates="interventions")
    farmer = relationship("Farmer")


class OfficerSchemeRecommendation(Base):
    __tablename__ = "officer_scheme_recommendations"

    id = Column(Integer, primary_key=True, index=True)
    farmer_id = Column(Integer, ForeignKey("farmers.id", ondelete="CASCADE"), nullable=False)
    officer_id = Column(Integer, ForeignKey("agro_officers.id", ondelete="CASCADE"), nullable=False)
    scheme_id = Column(Integer, ForeignKey("schemes.id", ondelete="CASCADE"), nullable=True)
    scheme_name = Column(String, nullable=False)  # stored for display even if scheme deleted
    scheme_type = Column(String, default="scheme")  # 'scheme' | 'loan'
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    officer = relationship("AgroOfficer", back_populates="scheme_recommendations")
    farmer = relationship("Farmer")


class CreditAssessment(Base):
    __tablename__ = "credit_assessments"

    id = Column(Integer, primary_key=True, index=True)
    farmer_id = Column(Integer, ForeignKey("farmers.id", ondelete="CASCADE"), nullable=False)
    loan_requested = Column(Float, nullable=False)
    credit_score = Column(Integer, nullable=False)
    repay_probability = Column(Float, nullable=False)
    status = Column(String, nullable=False) # APPROVED | MANUAL REVIEW | REJECTED — HIGH RISK
    approved_amount = Column(Float, nullable=False)
    land_acres = Column(Float, default=1.0)
    has_cold_storage = Column(Integer, default=0)
    uses_precision_tech = Column(Integer, default=0)
    sells_stubble = Column(Integer, default=0)
    does_sorting = Column(Integer, default=0)
    reason_codes = Column(Text, nullable=True) # JSON array of strings
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    farmer = relationship("Farmer")


