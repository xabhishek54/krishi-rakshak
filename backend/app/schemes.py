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
    {
        "name": "Soil Health Card Scheme (SHC)",
        "state": "All",
        "support_type": "Subsidy (Soil Testing & Nutrient Advisory)",
        "verification_url": "https://soilhealth.dac.gov.in",
        "conditions": json.dumps({
            "crops": [],
            "min_distress_score": 0,
            "description": "Free soil testing every 2 years. Provides crop-wise nutrient recommendations to optimize fertilizer use, saving 10-15% on input costs."
        })
    },
    {
        "name": "Rashtriya Krishi Vikas Yojana (RKVY)",
        "state": "All",
        "support_type": "Infrastructure Subsidy (Farm Mechanization)",
        "verification_url": "https://rkvy.nic.in",
        "conditions": json.dumps({
            "crops": [],
            "min_distress_score": 0,
            "description": "Funds farm infrastructure, machinery purchase, and post-harvest facilities. States allocate district-level grants; apply via state agriculture department."
        })
    },
    {
        "name": "Punjab Paani Bachao Paisa Kamao",
        "state": "Punjab",
        "support_type": "State Direct Transfer (Water Conservation Incentive)",
        "verification_url": "https://agripb.gov.in",
        "conditions": json.dumps({
            "crops": ["rice", "wheat", "sugarcane"],
            "min_distress_score": 0,
            "description": "Cash incentive of ₹7,000-₹9,000/acre for Punjab farmers who adopt direct seeded rice instead of transplanted paddy, reducing groundwater depletion."
        })
    },
    {
        "name": "Rythu Bandhu (Telangana / Andhra)",
        "state": "Telangana",
        "support_type": "State Direct Transfer (₹10,000/acre/season)",
        "verification_url": "https://rythubandhu.telangana.gov.in",
        "conditions": json.dumps({
            "crops": [],
            "min_distress_score": 0,
            "description": "Investment support of ₹5,000 per acre per season (₹10,000/year) to all land-owning farmers in Telangana, regardless of crop."
        })
    },
    {
        "name": "Karnataka Raita Shakthi",
        "state": "Karnataka",
        "support_type": "State Subsidy (Farm Input Support ₹5,000/acre)",
        "verification_url": "https://raitamitra.karnataka.gov.in",
        "conditions": json.dumps({
            "crops": [],
            "min_distress_score": 0,
            "description": "Karnataka's farmer relief scheme providing direct input subsidy of up to ₹5,000 per acre for small and marginal farmers."
        })
    },
    {
        "name": "Pradhan Mantri Annadata Aay SanraksHan Abhiyan (PM-AASHA)",
        "state": "All",
        "support_type": "Price Support (MSP Procurement Guarantee)",
        "verification_url": "https://pmaasha.gov.in",
        "conditions": json.dumps({
            "crops": ["tomato", "onion", "potato", "wheat", "rice", "maize", "soybean", "groundnut", "cotton"],
            "min_distress_score": 30,
            "description": "Ensures farmers receive MSP for oilseeds, pulses, and copra. Covers price deficiency payments when market price falls below MSP."
        })
    },
]



def seed_scheme_data(db: Session):
    """Seed government scheme data — inserts any scheme not already present by name."""

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
