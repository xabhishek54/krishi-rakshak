import json
from sqlalchemy.orm import Session
from . import models


SCHEMES = [
    {
        "name": "PM Fasal Bima Yojana (PMFBY)",
        "state": "All",
        "support_type": "Insurance (Crop Loss Compensation)",
        "verification_url": "https://pmfby.gov.in",
        "conditions": json.dumps({
            "crops": [],  # All crops
            "min_distress_score": 0,
            "description": "Subsidized crop insurance covering natural calamities, pests, and diseases. Farmers pay 2% for Kharif, 1.5% for Rabi crops."
        })
    },
    {
        "name": "PM Kisan Samman Nidhi (PM-KISAN)",
        "state": "All",
        "support_type": "Direct Income Support (₹6,000/year)",
        "verification_url": "https://pmkisan.gov.in",
        "conditions": json.dumps({
            "crops": [],  # All crops
            "min_distress_score": 0,
            "description": "Direct transfer of ₹2,000 per installment (₹6,000/year) to small & marginal farmers with land up to 2 hectares."
        })
    },
    {
        "name": "National Agriculture Market (e-NAM)",
        "state": "All",
        "support_type": "Market Access (Online Mandi Platform)",
        "verification_url": "https://enam.gov.in",
        "conditions": json.dumps({
            "crops": ["tomato", "onion", "wheat"],
            "min_distress_score": 0,
            "description": "Unified online trading platform linking APMC mandis. Enables farmers to sell directly to more buyers for competitive pricing."
        })
    },
    {
        "name": "Kisan Credit Card (KCC)",
        "state": "All",
        "support_type": "Credit Access (Short-term Crop Loan)",
        "verification_url": "https://www.nabard.org",
        "conditions": json.dumps({
            "crops": [],
            "min_distress_score": 20,
            "description": "Provides revolving credit up to ₹3 lakh at 4% annual interest to cover crop expenses, harvest, and post-harvest needs."
        })
    },
    {
        "name": "National Horticulture Mission (NHM)",
        "state": "All",
        "support_type": "Subsidy (Infrastructure & Inputs for Horticulture)",
        "verification_url": "https://nhm.nic.in",
        "conditions": json.dumps({
            "crops": ["tomato", "onion"],
            "min_distress_score": 0,
            "description": "Subsidizes protected cultivation (polyhouses), drip irrigation, cold storage access, and post-harvest management for vegetable farmers."
        })
    },
    {
        "name": "Price Stabilization Fund (PSF)",
        "state": "All",
        "support_type": "Price Support (Government Procurement at MSP)",
        "verification_url": "https://commerce.gov.in",
        "conditions": json.dumps({
            "crops": ["tomato", "onion"],
            "min_distress_score": 35,
            "description": "Government intervention to maintain supply and stabilize retail prices of perishables. Activated during market price crashes > 30%."
        })
    },
    {
        "name": "Maharashtra Shetkari Sanman Nidhi",
        "state": "Maharashtra",
        "support_type": "State Direct Transfer (₹12,000/year)",
        "verification_url": "https://mahadbt.maharashtra.gov.in",
        "conditions": json.dumps({
            "crops": [],
            "min_distress_score": 0,
            "description": "Maharashtra-specific supplemental income support scheme providing ₹6,000 per season to farmers registered in the state."
        })
    },
    {
        "name": "Pradhan Mantri Krishi Sinchai Yojana (PMKSY)",
        "state": "All",
        "support_type": "Infrastructure Subsidy (Drip/Sprinkler Irrigation)",
        "verification_url": "https://pmksy.gov.in",
        "conditions": json.dumps({
            "crops": [],
            "min_distress_score": 0,
            "description": "Subsidizes micro-irrigation (drip/sprinkler) infrastructure. Covers 55-90% of cost for small/marginal farmers. Reduces water use by 40-50%."
        })
    },
]


def seed_scheme_data(db: Session):
    """Seed government scheme data if not already present."""
    existing = db.query(models.Scheme).count()
    if existing >= len(SCHEMES):
        return

    for s in SCHEMES:
        existing_scheme = db.query(models.Scheme).filter(
            models.Scheme.name == s["name"]
        ).first()
        if not existing_scheme:
            scheme = models.Scheme(
                name=s["name"],
                state=s["state"],
                support_type=s["support_type"],
                verification_url=s["verification_url"],
                conditions=s["conditions"]
            )
            db.add(scheme)
    db.commit()
