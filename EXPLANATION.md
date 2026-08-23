# KrishiRakshak — System Explanation

## What is KrishiRakshak?

KrishiRakshak ("Farmer Protector") is an AI-powered early-warning and risk-intelligence advisory system for smallholder Indian farmers. It combines hyperlocal weather forecasting, machine learning yield estimation, market intelligence, and financial stress modeling to alert farmers before conditions become critical.

---

## Core Problem It Solves

> Indian smallholder farmers face crop losses from unseasonal rain, pest outbreaks, market price crashes, and loan repayment defaults — often simultaneously, with no advance warning.

KrishiRakshak unifies these risk signals into a single **Distress Score** and serves actionable interventions before damage becomes irreversible.

---

## System Architecture

```
┌─────────────────────────────────────────┐
│           Frontend (React + Vite)        │
│  Home · Crop · Market · Alerts · Support │
│  Profile · Risk Detail · Voice Playback  │
└─────────────────┬───────────────────────┘
                  │ REST API (CORS)
┌─────────────────▼───────────────────────┐
│         Backend (FastAPI + Python)       │
│                                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │ Advisory │ │  Mandi   │ │ Distress │ │
│  │  Engine  │ │ Ranker   │ │  Score   │ │
│  └──────────┘ └──────────┘ └──────────┘ │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │ Weather  │ │  Yield   │ │ Scheme   │ │
│  │ Sync     │ │  ML Model│ │ Matcher  │ │
│  └──────────┘ └──────────┘ └──────────┘ │
└─────────────────┬───────────────────────┘
                  │ SQLAlchemy ORM
        ┌─────────▼─────────┐
        │  SQLite / Postgres │
        │  (Supabase-ready)  │
        └───────────────────┘
```

---

## Feature Explanations

### 1. Hyperlocal Weather Sync
- Calls **Open-Meteo API** (free, no key required) with the farm's GPS coordinates.
- Retrieves 7-day hourly precipitation + temperature forecasts.
- Computed rainfall deficit vs. a 30mm weekly baseline.

### 2. Advisory & Pest Rule Engine (`advisory.py`)
- Rule JSON: matches crop type + growth stage + rainfall thresholds → recommendation + priority.
- Growth stage derived from sowing date (days since planting).
- Pest risk score computed from 3-day cumulative rainfall + temperature range.

### 3. APMC Mandi Economics (`mandi.py`)
- **Net Return = Modal Price − Transport Cost − Mandi Commission (2%)**
- Transport cost: ₹11/km up to 30km, then ₹8/km (per quintal).
- Distance calculated with Haversine formula from farm GPS to mandi GPS.
- Price crash alerts fire when 7-day average falls ≥ 20% below 30-day baseline.

### 4. Financial Resilience (`main.py` projections)
- Three scenarios: **Normal** (baseline), **Current** (ML yield × mandi price), **Stress** (−30% on current).
- Coverage Ratio = Projected Income ÷ Total Obligations Due.
- Obligations (loan, lease, input credit) added by farmer via modal.

### 5. Yield ML Model (`yield_model.py`)
- **RandomForestRegressor** trained on 2,000 synthetic samples.
- Features: `[crop_type, soil_type, irrigation_type, rainfall_deviation, temp_deviation]`
- Output: % yield deviation from baseline (negative = loss).
- Model serialized to `yield_model.pkl` and loaded once at server startup.

### 6. Distress Score (`distress.py`)
- **5-pillar weighted average (20% each):**
  - Weather: rainfall deficit proportion
  - Yield: ML deviation magnitude
  - Market: price vs. historical baseline
  - Financial: obligation coverage gap
  - Urgency: days until next payment due
- Score 0–100 → Stable (0–25) | Watch (25–40) | Elevated (40–55) | High (55–75) | Critical (75+)

### 7. Government Scheme Matcher (`schemes.py`)
- 8 national/state schemes seeded on startup.
- Eligibility filtered by: crop type, distress score threshold, state.
- Schemes: PMFBY, PM-KISAN, e-NAM, KCC, NHM, PSF, Maharashtra Shetkari Nidhi, PMKSY.

### 8. Multi-language System (`translations.ts`)
- 40+ UI string keys translated into 5 languages.
- Language persisted in `localStorage`.
- Voice synthesis uses Web Speech API with matching locale tag.

---

## Database Schema

```
Farmer ─── Farm ─── Crop
  │           │
  │        WeatherForecast
  │        FinancialObligation
  │
  ├── Advisory
  ├── Alert
  ├── DistressScore
  └── Scheme (global, not per-farmer)

Mandi ─── MarketPrice (time-series)
```

---

## Running Locally

See `README.md` for full step-by-step commands.

**Quick start:**
```bash
# Backend
cd backend && source .venv/bin/activate && uvicorn app.main:app --reload

# Frontend (new terminal)
cd frontend && npm run dev
```

Open: http://localhost:5173

---

## Deployment (Supabase)

Set environment variable before starting backend:
```
DATABASE_URL=postgresql://user:password@host:port/db
```
SQLAlchemy will use PostgreSQL automatically. All FK relations are migration-ready.
