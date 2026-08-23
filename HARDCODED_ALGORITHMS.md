# KrishiRakshak — Simulated and Hardcoded Systems Report

To make the application robust, offline-capable, and fully demoable for pitch presentations under hackathon constraints, several dynamic algorithms have designated baseline defaults, heuristics, or fallbacks if live data/ML model queries fail or are absent.

Below is a breakdown of what is simulated/hardcoded vs. what is computed using proper live services and models.

---

## 1. Yield & Distress Risk Prediction
* **How it works:** The backend uses `predict_yield_deviation` (defined in `backend/app/yield_model.py`) which simulates soil, irrigation, and weather influences.
* **Fallback Heuristics:** 
  * If a farmer registers *no* crops, the distress calculator assigns a **Tomato crop fallback** (expected baseline yield: 12 q/acre, cost: ₹12,000/acre, price: ₹2,600/q) to project hypothetical distress.
  * In the frontend Yield Calculator, if the backend server is unreachable (offline mode), a client-side multiplier matrix simulates the exact math:
    * **Irrigation Multiplier:** Drip (+15%), Sprinkler (+10%), Flood (baseline), Rain-fed (-25%).
    * **Soil Multiplier:** Loam (1.0), Black cotton (1.1), Clay (0.9), Sandy (0.8), Red (0.85).
    * **Rainfall Multiplier:** Linear deviation scale.
* **Hardcoded Parameters in Distress Calculation:**
  * Base prices used when market data unavailable: Tomato: ₹2600/q, Wheat: ₹2100/q, Onion: ₹1800/q
  * Crop-specific parameters (yield per acre, price, cost per acre):
    * Tomato: (12.0 q/acre, ₹2600/q, ₹12000/acre)
    * Wheat: (16.0 q/acre, ₹2100/q, ₹9000/acre)
    * Onion: (14.0 q/acre, ₹1800/q, ₹10000/acre)
  * Default weather deviation values when no forecast data: Rainfall deviation = -15.0%, Temperature deviation = +1.0°C

## 5. AI Intervention Recommendation Engine *(Killer Feature - NOW IMPLEMENTED)*
* **How it works:** Implements a three-stage hybrid system as specified in the feature guide:
  * **Stage 1 - Rule Engine:** Maps distress components to candidate actions using configurable rules in `rules.json` under "intervention_rules"
  * **Stage 2 - ML Ranking:** Uses RandomForestClassifier (`intervention_model.pkl`) trained on synthetic data to rank actions by relevance
  * **Stage 3 - LLM Phrasing:** Converts ranked actions to plain language using templates (English/Hindi) - designed for offline capability
* **Implementation Files:**
  * `backend/app/intervention.py` - Main logic for the three-stage pipeline
  * `backend/app/train_intervention_model.py` - Training script for the ML model
  * `backend/app/intervention_model.pkl` - Pre-trained RandomForestClassifier model
  * Updated `backend/app/rules.json` with intervention_rules configuration
  * Modified `backend/app/distress.py` to auto-generate recommendations after distress score calculation
  * Added API endpoints in `backend/app/main.py`:
    * `POST /api/v1/farmers/me/recommendations/generate` - Generate recommendations on demand
    * `GET /api/v1/farmers/me/recommendations` - Get current recommendations
    * `PATCH /api/v1/recommendations/{recommendation_id}` - Update recommendation status
* **Action Types Supported:**
  * irrigation_advisory, crop_insurance_check, alternate_mandi, contact_support
  * scheme_eligibility, drainage_check, pest_prevention, loan_rescheduling
* **Offline Capability:** All components work without external API calls. ML model is embedded, language templates are local, and rule-based fallbacks ensure functionality.

## 2. Weather & Forecast Data
* **Live Integration:** Retrieves actual current weather when available.
* **Fallbacks (Hardcoded):**
  * When mock locations or unlinked location blocks are queried, the weather manager falls back to a static observation profile:
    * **Temperature:** 24.5°C
    * **Rainfall:** 10.0 mm
    * **Humidity:** 72%
    * **Rainfall Forecast:** A baseline of 40 mm is assumed for the district to calculate deviation.

## 3. Mandi Prices (Agmarknet Fetch)
* **Background Task:** On startup, an asynchronous task (`fetch_agmarknet_prices`) fetches real mandi rates from the Agmarknet API for top crops (Tomato, Wheat, Onion).
* **Hardcoded Seed Data:**
  * If the API call fails, times out, or has no entries for the location, a set of live-like seed prices are stored in SQLite:
    * **Tomato:** ₹2,600 / q
    * **Wheat:** ₹2,100 / q
    * **Onion:** ₹1,800 / q
  * If a mandi price row is entirely missing for a user crop, the MSP rate is used (e.g. ₹2,275/q for Wheat, ₹2,183/q for Rice).

## 4. Distress Severity Thresholds
* **Weighted Metric:** The final distress score is an average of 5 components: weather, yield, market, financial obligation coverage, and payment urgency.
* **Size Buffering:** Added a **Farm Area discount** where every acre owned subtracts from distress risk (up to 20 points off for 5+ acres) because larger holdings offer financial padding.
* **Hardcoded Levels (Note: These differ from the feature documentation in 01_features.md):**
  * Score ≥ 75: **Critical**
  * Score ≥ 50: **High**
  * Score ≥ 35: **Elevated**
  * Score ≥ 20: **Watch**
  * Score < 20: **Stable**
* **Documentation Discrepancy:** The feature guide (01_features.md) documents different thresholds (0-29 Stable, 30-49 Watch, 50-69 Elevated, 70-84 High, 85-100 Critical), but the actual implementation uses the thresholds listed above.

---

## Features Requiring Verification
The following features were not clearly identified in the backend code review and may require further investigation to determine if they are properly implemented or rely on hardcoded/simulated data:

5. Crop Recommendation (Next-Season Planning)
15. Regional-Language Advisory
16. Voice Playback
17. Voice Input
18. Offline Cached Advisory

These features may be implemented in the frontend or may have simulated implementations that should be documented if found to be hardcoded.

---

*Report generated on August 23, 2026 for review and demonstration.*