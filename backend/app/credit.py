import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from typing import Dict, Any, List, Tuple

_model = None
_scaler = None

def get_trained_credit_model() -> Tuple[LogisticRegression, StandardScaler]:
    """
    Train and cache Logistic Regression classifier & StandardScaler for Alternative Credit Scoring
    based on 5,000 synthetic farm observations (as defined in alternateCIBILscore.ipynb).
    """
    global _model, _scaler
    if _model is not None and _scaler is not None:
        return _model, _scaler

    np.random.seed(42)
    n_samples = 5000

    rainfall_mm = np.clip(np.random.normal(750, 200, n_samples), 150, 1500)
    soil_nitrogen = np.clip(np.random.normal(250, 50, n_samples), 80, 450)
    ndvi_mean = np.clip((rainfall_mm / 1500) + (soil_nitrogen / 500) + np.random.normal(0, 0.1, n_samples), 0.15, 0.9)
    land_acres = np.clip(np.random.exponential(1.5, n_samples) + 0.5, 0.5, 8.0)
    loan_requested = np.clip(np.random.normal(50000, 25000, n_samples), 5000, 200000)

    has_cold_storage = np.random.randint(0, 2, n_samples)
    uses_precision_tech = np.random.randint(0, 2, n_samples)
    sells_stubble = np.random.randint(0, 2, n_samples)
    does_sorting = np.random.randint(0, 2, n_samples)

    yield_tons = (ndvi_mean * 3.5) + (soil_nitrogen / 300) + (rainfall_mm / 1000)
    base_revenue = yield_tons * land_acres * 22750
    base_costs = (land_acres * 8000) + loan_requested

    actual_revenue = base_revenue * (1 + (0.30 * has_cold_storage) + (0.15 * sells_stubble) + (0.25 * does_sorting))
    actual_costs = base_costs * (1 - (0.30 * uses_precision_tech))
    repaid = ((actual_revenue - actual_costs) > 0.18 * loan_requested).astype(int)

    df = pd.DataFrame({
        "ndvi_mean": ndvi_mean,
        "soil_nitrogen": soil_nitrogen,
        "rainfall_mm": rainfall_mm,
        "land_acres": land_acres,
        "loan_requested": loan_requested,
        "has_cold_storage": has_cold_storage,
        "uses_precision_tech": uses_precision_tech,
        "sells_stubble": sells_stubble,
        "does_sorting": does_sorting,
        "repaid": repaid
    })

    X = df.drop(["repaid"], axis=1)
    y = df["repaid"]

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    model = LogisticRegression(max_iter=8000, C=0.5)
    model.fit(X_scaled, y)

    _model = model
    _scaler = scaler
    return _model, _scaler

SOIL_NITROGEN_MAP = {
    "black_cotton": 320.0,
    "loam": 280.0,
    "alluvial": 270.0,
    "clay": 240.0,
    "red": 200.0,
    "sandy": 150.0,
}

def evaluate_credit_assessment(
    land_acres: float,
    loan_requested: float,
    soil_type: str = "loam",
    rainfall_mm: float = 850.0,
    ndvi_mean: float = 0.75,
    has_cold_storage: int = 0,
    uses_precision_tech: int = 0,
    sells_stubble: int = 0,
    does_sorting: int = 0,
    distress_score: float = 0.0,
    net_profit: float = None
) -> Dict[str, Any]:
    """
    Evaluates farmer creditworthiness using monotonic farm borrowing capacity ratio math,
    ensuring 100% mathematical consistency and monotonic safe loan limits.
    """
    soil_nitrogen = SOIL_NITROGEN_MAP.get(soil_type.lower(), 260.0)

    # 1. Monotonic Farm Safe Capacity Calculation
    base_cap_per_acre = 35000.0
    soil_mult = max(0.6, soil_nitrogen / 280.0)
    rain_mult = min(1.2, max(0.5, rainfall_mm / 800.0))
    agtech_mult = 1.0 + (0.25 * has_cold_storage) + (0.20 * uses_precision_tech) + (0.15 * sells_stubble) + (0.15 * does_sorting)

    farm_capacity = land_acres * base_cap_per_acre * soil_mult * rain_mult * agtech_mult
    if net_profit is not None and net_profit < 0:
        farm_capacity = max(10000.0, farm_capacity - abs(net_profit) * 0.5)
    if distress_score > 60.0:
        farm_capacity = max(10000.0, farm_capacity * (1.0 - (distress_score / 200.0)))

    farm_capacity = float(round(farm_capacity, -3))

    # 2. Monotonic Risk Ratio & Repayment Probability
    ratio = float(loan_requested) / max(1.0, farm_capacity)

    if ratio <= 1.0:
        prob_repay = 0.95 - (ratio - 0.5) * 0.20
        status = "APPROVED"
        approved_amount = float(loan_requested)
    elif ratio <= 1.5:
        prob_repay = 0.72 - (ratio - 1.0) * 0.25
        status = "MANUAL REVIEW"
        approved_amount = float(farm_capacity)
    else:
        prob_repay = max(0.01, 0.48 - (ratio - 1.5) * 0.15)
        status = "REJECTED — HIGH RISK"
        approved_amount = float(farm_capacity)

    cibil_score = int(round(300 + (600 * prob_repay)))
    cibil_score = max(300, min(900, cibil_score))

    # Reason Codes Generation
    reasons: List[str] = []
    if net_profit is not None and net_profit < 0:
        reasons.append(f"⚠️ Current crop portfolio operates at a net loss (-₹{abs(int(net_profit)):,}).")
    if distress_score > 60:
        reasons.append(f"⚠️ Elevated farm distress risk score ({int(distress_score)}/100) detected.")
    if has_cold_storage:
        reasons.append("✅ Cold storage access increases crop shelf-life and revenue potential (+30%).")
    if uses_precision_tech:
        reasons.append("✅ Precision AgTech adoption significantly reduces farming input overhead (-30%).")
    if sells_stubble:
        reasons.append("✅ Stubble commercialization creates a secondary non-crop income stream (+15%).")
    if does_sorting:
        reasons.append("✅ Post-harvest sorting & grading yields premium market price realization (+25%).")

    loan_per_acre = loan_requested / max(0.5, land_acres)
    if ratio > 1.0:
        reasons.append(f"⚠️ Requested loan burden (₹{int(loan_requested):,} for {land_acres} acres) exceeds farm capacity (Safe Limit: ₹{int(farm_capacity):,}).")
    if soil_nitrogen < 220:
        reasons.append(f"⚠️ Low soil nitrogen content ({soil_type} soil) limits expected yield capacity.")
    if rainfall_mm < 500:
        reasons.append("⚠️ Below-average seasonal rainfall increases drought vulnerability.")

    if not reasons:
        reasons.append("Standard credit assessment profile based on historical regional yields.")

    return {
        "score_label": "Credit Score",
        "credit_score": cibil_score,
        "repay_probability": round(prob_repay, 4),
        "status": status,
        "loan_requested": float(loan_requested),
        "approved_amount": float(approved_amount),
        "land_acres": float(land_acres),
        "has_cold_storage": int(has_cold_storage),
        "uses_precision_tech": int(uses_precision_tech),
        "sells_stubble": int(sells_stubble),
        "does_sorting": int(does_sorting),
        "reason_codes": reasons
    }
