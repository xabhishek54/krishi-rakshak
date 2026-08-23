# KrishiRakshak — System Explanation

## What is KrishiRakshak?

KrishiRakshak ("Farmer Protector") is an AI-powered early-warning and risk-intelligence advisory system for smallholder Indian farmers. It combines hyperlocal weather forecasting, machine learning yield estimation, market intelligence, financial stress modeling, and conversational AI to alert farmers before conditions become critical — delivered in their regional language via voice.

---

## Core Problem It Solves

> Indian smallholder farmers face crop losses from unseasonal rain, pest outbreaks, market price crashes, and loan repayment defaults — often simultaneously, with no advance warning.

KrishiRakshak unifies these risk signals into a single **Distress Score** and serves actionable interventions before damage becomes irreversible. Critically, all advice is grounded in the farmer's **actual data** (real farm coordinates, real crop stage, real weather) — not generic templates.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Frontend (React + Vite)                    │
│   Home · Crop Grid · Market · Alerts · Support · Profile     │
│   Voice Q&A (Gemini) · Map Picker · Toast Notifications      │
└─────────────────────┬───────────────────────────────────────┘
                      │ REST API (CORS)
┌─────────────────────▼───────────────────────────────────────┐
│                 Backend (FastAPI + Python)                    │
│                                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐  │
│  │ Advisory │ │  Mandi   │ │ Distress │ │ Scheme Ranker  │  │
│  │  Engine  │ │ Ranker   │ │  Score   │ │ (5-factor ML)  │  │
│  └──────────┘ └──────────┘ └──────────┘ └───────────────┘  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐  │
│  │ Weather  │ │  Yield   │ │ Agmarknet│ │  DB Migration  │  │
│  │ Sync     │ │  ML Model│ │  Fetcher │ │  (startup)     │  │
│  └──────────┘ └──────────┘ └──────────┘ └───────────────┘  │
└─────────────────────┬───────────────────────────────────────┘
                      │ SQLAlchemy ORM
            ┌─────────▼─────────┐
            │  SQLite / Postgres │
            │  (Supabase-ready)  │
            └───────────────────┘
                      │
         ┌────────────┼────────────┐
    Open-Meteo    Agmarknet     Gemini AI
    (weather)   (mandi prices)  (voice Q&A)
```

---

## Feature Explanations

### 1. Hyperlocal Weather Sync
- Calls **Open-Meteo API** (free, no key) with farm GPS coordinates.
- Retrieves 7-day hourly precipitation + temperature forecasts.
- Computes rainfall deficit vs. 40mm weekly expected baseline.
- Cached to DB; re-fetched via `POST /api/v1/weather/{location_id}/refresh`.

### 2. Advisory & Pest Rule Engine (`advisory.py`)
- **Deterministic rule-based** (not LLM): crop type + growth stage + rainfall thresholds → recommendation.
- Growth stage derived from sowing date (days since planting → mapped to stages).
- Pest risk: 3-day cumulative rainfall + temperature range triggers species-specific alerts.
- Advisory now generated **per (farm, crop) pair** — all crops shown simultaneously.

### 3. APMC Mandi Economics (`mandi.py`)
- **Net Return = Modal Price − Transport Cost − Mandi Commission (2%)**
- Transport cost: ₹11/km up to 30km, then ₹8/km (per quintal).
- Distance: Haversine formula from farm GPS to mandi GPS.
- **Bug fixed**: previously used the farmer's first farm (could be far away). Now uses the farm **closest to any mandi** (minimum distance selection).
- Price crash: 7-day average falls ≥ 20% below 30-day baseline → alert.
- **Live data**: Agmarknet via data.gov.in API (key configured). Falls back to seeded data when API is slow.

### 4. Financial Resilience (`main.py` projections)
- Three scenarios: **Normal** (baseline assumptions), **Current** (ML yield × mandi price), **Stress** (−30% on current).
- `Coverage Ratio = Projected Income ÷ Total Obligations Due`
- Formula: `Revenue = Farm Area (acres) × Yield/acre × Realized Price`
- Obligations (loan, lease, input credit) added by farmer via modal.
- **Distress narrative is dynamic**: mentions obligation only if farmer has added one.

### 5. Yield ML Model (`yield_model.py`)
- **RandomForestRegressor** trained on 2,000 synthetic samples.
- Features: `[crop_type, soil_type, irrigation_type, rainfall_deviation, temp_deviation]`
- Output: % yield deviation from baseline (negative = loss).
- Serialized to `yield_model.pkl`, loaded once at startup.

### 6. Distress Score (`distress.py`)
- **5-pillar weighted average (20% each)**:
  - 🌧 Weather: rainfall deficit proportion
  - 🌱 Yield: ML deviation magnitude
  - 📉 Market: price vs. historical baseline
  - 💰 Financial: obligation coverage gap (only if obligations exist)
  - ⏰ Urgency: days until next payment due
- Score 0–100 → Stable (0–25) | Watch (25–40) | Elevated (40–55) | High (55–75) | Critical (75+)
- **All alert text is generated dynamically from real component scores** — no hardcoded narratives.

### 7. Government Scheme Matcher (`schemes.py`)
- **14 schemes** seeded (national + state-specific: Punjab, Telangana, Karnataka, Maharashtra, All).
- **5-factor relevance ranking** (0–100 score): crop match (40%) + distress urgency (30%) + state (15%) + irrigation type (10%) + farm size (5%).
- Top ⅓ flagged as `is_recommended=True`, shown in a highlighted "Recommended for You" section.
- Schemes: PMFBY, PM-KISAN, e-NAM, KCC, NHM, PSF, SHC, RKVY, PM-AASHA, Maharashtra Shetkari Nidhi, PMKSY, Punjab Paani Bachao, Rythu Bandhu, Karnataka Raita Shakthi.

### 8. Multi-language System
- **Static UI strings** (`translations.ts`): 40+ keys in English, Hindi, Marathi, Bengali, Odia.
- **Dynamic text translation** (`translate.ts`): MyMemory free API (5000 req/day), cached to `localStorage` by content hash — advisory text, distress narratives, scheme descriptions.
- Voice synthesis uses Web Speech API with matching BCP-47 locale (`hi-IN`, `mr-IN`, `bn-IN`, `or-IN`, `en-IN`).

### 9. Voice Playback + Gemini Q&A (`voice.ts`)
- **Voice button** reads the most relevant content for the active tab:
  - Home/Crop → top advisory recommendation
  - Alerts → distress score summary
  - Market → best mandi + net return
  - Support → top recommended scheme
- Text is **translated to farmer's language** before speaking.
- **Conversational Q&A**: farmer speaks a question → SpeechRecognition API captures it → sent to **Gemini 3.1 Flash Lite** with full farm context (crops, distress, weather, advisories) → answer text → translated → spoken aloud.
- Gemini's role is **phrasing only** — it receives the structured agricultural data and answers factually based on it. It does not generate agricultural recommendations independently.

### 10. Multi-Crop Display (`App.tsx`)
- `allCrops` state loads crops from **all farms in parallel** on login.
- Crop tab shows a **card grid** with crop image, stage badge (color-coded), farm label, days since sowing.
- Clicking a crop card selects it as the active crop for market + advisory context.
- Market tab has a **crop switcher dropdown** when farmer has multiple crops.

### 11. DB Auto-Migration (`migrations.py`)
- Runs on every backend startup as the first action.
- Idempotent: checks each column with `SELECT` before `ALTER TABLE`.
- Covers: `crops.image_url`, `crops.expected_harvest_date`, `farms.state/district/name`, `farmers.risk_profile/language`.
- Prevents the `OperationalError: no such column` crash on legacy databases.

### 12. Map-Based Farm Registration (`MapPicker.tsx`)
- **Leaflet.js + OpenStreetMap** (fully free, no API key).
- Farmer clicks on the map to pin their farm location — coordinates auto-fill the form.
- Falls back to manual state/district selector with real India locations hierarchy.
- State + district selection drives weather location resolution and scheme matching.

---

## Engineering Decisions

| Decision | Rationale |
|----------|-----------|
| SQLite default, Postgres-ready | Zero setup locally; one env var switches to Supabase |
| RandomForest for yield | Explainable feature importances; no GPU; 2,000 synthetic samples sufficient for prototype |
| Rule-based advisory (not LLM) | Deterministic, testable, zero hallucination risk, works offline |
| Gemini only for phrasing/Q&A | LLM never makes agricultural decisions; it only phrases what the rule engine already decided |
| MyMemory for translation | Free, no key, 5000 req/day; cached so each string is only translated once |
| Leaflet not Google Maps | Fully free, works offline, no key quota or billing risk |
| Nearest-farm mandi selection | First farm may have wrong-state coordinates; nearest-to-mandi is always geographically correct |
| Dynamic distress narrative | Hardcoded strings showed fake data regardless of user's actual state |

---

## Database Schema

```
Farmer ─── Farm ─── Crop
  │           │
  │        WeatherForecast
  │        WeatherObservation
  │        FinancialObligation
  │
  ├── Advisory
  ├── Alert
  ├── DistressScore (computed, stored per run)
  └── FarmProjection (Normal / Current / Stress)

Mandi ─── MarketPrice (time-series)
Scheme (global catalogue, not per-farmer)
```

---

## APIs & Keys

| Service | Key/Auth | Used For |
|---------|----------|----------|
| Open-Meteo | None required | Weather forecasts |
| data.gov.in Agmarknet | `579b464db66ec23bdd000001c5dbc8cb04004c3a7dbfdbe429d6a773` | Live mandi prices |
| Gemini 3.1 Flash Lite | `AQ.Ab8RN6J_1kwgFChbLdh03PsSEJV3x4L2AYKAMv03Ydpt2nsExQ` | Voice Q&A (text-in, text-out) |
| MyMemory Translation | None required | Dynamic UI translation |
| Leaflet/OpenStreetMap | None required | Farm map picker |

---

## Running Locally

See `README.md` for full commands.

```bash
# Backend
cd backend && source .venv/bin/activate
uvicorn app.main:app --reload

# Frontend (new terminal)
cd frontend && npm run dev
```

Open: http://localhost:5173

---

## Deployment (Supabase / PostgreSQL)

```bash
export DATABASE_URL=postgresql://user:password@host:port/db
```

SQLAlchemy switches to PostgreSQL automatically. All FK relations and migrations are production-ready.

---

## New Features (2026-08-23 Update)

### 13. Instant Voice Q&A — "Farm AI" (`handleInstantMic`)
- The voice button now opens instantly into listening mode with zero modals.
- **Pipeline**: tap mic → browser SpeechRecognition starts (no confirmation needed) → farmer speaks → transcript sent to Gemini 3.1 Flash Lite with full farm context (crops, weather, advisories, distress) → answer text → translated to farmer language → spoken via Web Speech API.
- Floating overlay card shows: waveform animation (listening), "Thinking…" indicator, answer text, "Play again" button.
- Branding: never says "Gemini". UI labels it "Farm AI" or "Farm Advisor".
- Fallback: if SpeechRecognition not available in browser, falls back to reading advisory text aloud.

### 14. Distress Score 5-Pillar Detail View (`risk-detail` tab)
The risk-detail tab now shows full transparency into how distress is calculated:

**Overall Score Card**: dark gradient card with animated bar, shows composite score prominently.

**5 Pillars** (expandable cards with `<details>` element):
| Pillar | Weight | What it measures |
|--------|--------|-----------------|
| 🌦️ Weather Risk | 25% | Rainfall deficit/surplus + temperature extremes vs seasonal norms |
| 📉 Market Risk | 25% | Price crash severity vs 30-day rolling mandi average |
| 🌾 Yield Risk | 20% | ML yield deviation from baseline (RandomForest model) |
| 💰 Financial Pressure | 20% | Loan/obligation coverage gap vs projected income |
| ⏰ Urgency Factor | 10% | Time-pressure amplifier for near-deadline obligations |

Each pillar shows: current score (animated bar), what it measures (plain language), calculation formula (monospace), common causes (bullet list).

**Financial Scenarios Table**: 3 rows — Normal / Current / Stress(−30%) — each showing net income, total obligations, coverage ratio (x.xx×).

**Obligation Cards**: show ₹ amount, type, due date, days remaining. Cards due ≤7 days are highlighted red.

### 15. Advisory Engine — Real Condition Matching
The advisory engine now fires based on real monsoon conditions:
- **humidity_min**: fires when observed humidity exceeds threshold (real today's observation)
- **rain_probability_min**: fires when forecast rain probability exceeds threshold
- **temperature_min**: fires when temperature is below threshold
- **Empty conditions `{}`**: unconditional rule — fires for any farm with that crop at that stage, every time

Current Nashik weather (27°C, 71% humidity, 69% rain probability) generates 3 real advisories:
1. **[MEDIUM] crop_management**: Monitor tomato fruit quality — unconditional stage advisory
2. **[HIGH] pest**: Apply preventive fungicide to tomato — humidity >70% triggers monsoon fungal risk
3. **[HIGH] irrigation**: Reduce tomato irrigation — rain probability >60%

### 16. Community District Risk Map (`community` tab)
- New tab showing anonymised district-level distress aggregates.
- Backend: SQL aggregate (avg distress score by district, joined from Farm.district).
- Frontend: coloured district cards (Critical=red, High=orange, Elevated=yellow, Stable=green) with animated score bars.
- Live data: Nashik 35.8/100 (Watch, 3 farmers), Rourkela 26.5/100 (Watch, 1 farmer).
- Privacy: only aggregated scores shared, no individual farmer data.

### 17. Agmarknet Background Price Fetch (Phase 19)
- `background_fetch_and_store()` runs at server startup via `asyncio.create_task()`.
- Uses `asyncio.to_thread()` to run the blocking HTTP request in a thread pool.
- Fetches live modal/min/max prices for tomato, onion, wheat, potato, maize from Agmarknet API.
- Stores to `market_prices` table with `source='agmarknet_live'`.
- Manual refresh: `POST /api/v1/market/refresh-live-prices` (authenticated).

### 18. Translation Wired to All Advisory/Alert Renders
- `translatedAdvisories` and `translatedAlerts` are now actually used in all 3 render locations.
- Fallback: if translation hasn't loaded yet, renders raw English text.
- Language change → useEffect re-translates all advisory recommendation + reason fields.

### 19. Demo Account (Fully Engine-Driven)
Credentials: `+919876543210` / `demo1234`

| Field | Value |
|-------|-------|
| Name | Ramesh Patil |
| Language | Marathi |
| Location | Nashik, Maharashtra |
| Farm 1 | Nashik Main Farm — 3.5 acres, loam, drip |
| Farm 2 | Pimpalgaon Plot — 1.8 acres, black cotton, sprinkler |
| Crop 1 | Tomato (Namdhari NS-585) — 52 days, Fruit Development |
| Crop 2 | Onion (Nasik Red) — 35 days, Vegetative Growth |
| Crop 3 | Wheat (HD-2967) — 20 days, Germination |
| Obligation 1 | ₹45,000 KCC loan repayment (18 days) |
| Obligation 2 | ₹12,000 input credit (5 days) |
| Weather | Live from Open-Meteo: 27°C, 71% humidity, 1.3mm rain |
| Advisories | 3 real advisories from rule engine |
| Distress | 40.4/100 Elevated (real computation) |

