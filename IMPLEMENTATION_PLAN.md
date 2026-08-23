# KrishiRakshak Early-Warning & Response System Implementation Plan

This is the local implementation plan mapping out the development of KrishiRakshak from repository initialization to a fully working application.

---

## Phase 1 — Foundation & Environment Setup ✅ COMPLETE

### Objective
Initialize git configurations, local status files, FastAPI backend project skeleton, virtual environments, and React Vite frontend.

### Deliverables
- Comprehensive `.gitignore` and `README.md` instructions.
- Local tracking files: `IMPLEMENTATION_PLAN.md`, `PROGRESS.md`, and `EXPLANATION.md`.
- FastAPI backend template inside `backend/` with a virtual environment and `requirements.txt`.
- Vite React TypeScript frontend skeleton inside `frontend/` with styling configuration.

### Tasks
- [x] Create comprehensive `.gitignore` in repository root.
- [x] Write detailed step-by-step commands to run the project in `README.md`.
- [x] Create `IMPLEMENTATION_PLAN.md` (this file), `PROGRESS.md`, `EXPLANATION.md`.
- [x] Set up Python virtual environment, `requirements.txt`, and basic server skeleton.
- [x] Set up Vite + React + TypeScript + TailwindCSS v4 frontend skeleton.
- [x] Run verification tests (backend healthcheck API, frontend compile/run).
- [x] Commit initial working repository setup to Git.

---

## Phase 2 — Database Models & JWT Authentication ✅ COMPLETE

### Objective
Establish the relational DB schema for SQLite/PostgreSQL and build the farmer sign-up/login JWT authentication system.

### Deliverables
- Database tables initialized for SQL mapping via SQLAlchemy.
- `/api/v1/auth/register` and `/api/v1/auth/login` working endpoints.
- User session tracking on frontend.

### Tasks
- [x] Create SQLAlchemy model classes representing all tables (Farmer, Farm, Crop, Location, Weather, Advisory, Alert, Mandi, MarketPrice, Scheme, DistressScore, etc.)
- [x] Set up dual database logic in `database.py` (SQLite fallback / PostgreSQL).
- [x] Build user registration and password hashing routines (`auth.py`).
- [x] Build JWT issuance and verification middleware.
- [x] Connect authentication pages on the frontend (login/register forms).
- [x] `tests/test_auth.py` — 6 tests passing.

---

## Phase 3 — Farmer Profile Onboarding & Weather Sync ✅ COMPLETE

### Objective
Implement progressive onboarding wizards for configuring farms, crops, and location. Sync hyperlocal weather from Open-Meteo API.

### Deliverables
- Multi-step onboarding wizard form.
- Location-based weather card on dashboard.

### Tasks
- [x] Create wizard supporting location detection (GPS fallback to manual input).
- [x] Map client fields to backend endpoints: `PUT /api/v1/farmers/me` and `POST /api/v1/farmers/me/farms`.
- [x] Implement crop details selection (variety, sowing date, crop image URL).
- [x] Multi-farm and multi-crop support — farmers can add/switch between multiple farms and crops.
- [x] Crop image: auto-assigned from Unsplash if not provided, with manual URL override.
- [x] `OpenMeteoProvider` sync pulling 7-day hourly temperature + precipitation forecasts.
- [x] Weather summary card on home dashboard.
- [x] `tests/test_profile_weather.py` — 4 tests passing.

---

## Phase 4 — Advisory & Pest Risk Rule Engine ✅ COMPLETE

### Objective
Develop a rule engine to produce agricultural recommendations and pest warnings based on current crop, growth stage, and weather forecasts.

### Deliverables
- Rule engine evaluator in `advisory.py`.
- Actionable "What should I do today?" advisor list on dashboard.
- Pest risk warning alerts.

### Tasks
- [x] Design rule configuration matching crop stage and rain thresholds.
- [x] Write backend endpoint returning matching advisories (`GET /api/v1/advisories`).
- [x] Implement pest warning evaluator using weather forecast history.
- [x] Advisory and alert cards wired to dashboard.
- [x] `tests/test_advisory.py` — 2 tests passing.

---

## Phase 5 — Mandi Economics & Net Realization ✅ COMPLETE

### Objective
Incorporate APMC mandi datasets and calculate net returns using Haversine-distance-based transport costs to recommend the best selling location.

### Deliverables
- Net realization ranking: `modal_price − transport_cost − mandi_fees`.
- Mandi comparison table on frontend (sorted by net return).
- Price-crash banner when 7-day price drops ≥ 20%.
- 30/60/90-day price history Recharts graph.

### Tasks
- [x] Seed 10+ APMC mandis with realistic coordinates (Nashik/Maharashtra district).
- [x] Haversine distance calculation from farmer's farm lat/lon to each mandi.
- [x] Transport cost: ₹11/km for first 30km, ₹8/km thereafter (per quintal).
- [x] Mandi commission fee: 2% of modal price.
- [x] Implement price-crash warnings for drops ≥ 20% from 30-day baseline.
- [x] Price trend chart with 30/60/90-day window filters.
- [x] `tests/test_mandi.py` — 3 tests passing.

---

## Phase 6 — Financial Resilience & Scenario Projections ✅ COMPLETE

### Objective
Construct projections of prospective farm revenue against upcoming loan obligations across Normal, Current, and Stressed weather/price conditions.

### Deliverables
- Scenario projection grid with coverage ratios.
- "Add Obligation" modal to track loans, leases, input credits.
- Dynamic cash flow surplus/deficit calculation.

### Tasks
- [x] Build backend schema and CRUD for `FinancialObligation` (loan, lease, inputs, other).
- [x] Implement `GET /api/v1/farmers/me/projections` — yield × price − costs − obligations.
- [x] Three-scenario table: Normal / Current / Stress (-30%) × coverage ratio.
- [x] Add Obligation modal overlay on frontend with type/amount/due-date fields.
- [x] Live surplus/shortfall badge on Risk Detail view.
- [x] `tests/test_financial.py` — 1 test passing.

---

## Phase 7 — PWA Offline Manifest (partial) ✅ COMPLETE

### Objective
Serve the app as an installable Progressive Web App with basic service worker caching.

### Tasks
- [x] `manifest.webmanifest` configured in Vite for mobile install prompt.
- [x] App works offline using cached HTML/JS/CSS (Vite PWA plugin asset caching).

---

## Phase 8 — Multi-language Accessibility ✅ COMPLETE

### Objective
Support 5 regional Indian languages — English, Hindi, Marathi, Bengali, Odia — for key UI labels.

### Deliverables
- `src/translations.ts` — full UI string dictionary for all 5 languages.
- Language switcher on Profile tab; selection persisted to `localStorage`.
- Active tab headings and navigation labels switch instantly on selection.

### Tasks
- [x] Define `Translations` interface with 40+ UI string keys.
- [x] Translate all keys into Hindi, Marathi, Bengali, and Odia.
- [x] Wire `const t = translations[language]` shorthand into App.tsx.
- [x] Language persisted to `localStorage` key `kr_language`.

---

## Phase 9 — Yield Estimation ML Model ✅ COMPLETE

### Objective
Train and serialize a machine learning regression model to estimate crop yield deviations under abnormal weather.

### Deliverables
- `app/train_yield_model.py` — synthetic dataset generator and training script.
- `app/yield_model.pkl` — serialized RandomForestRegressor (50 estimators).
- `app/yield_model.py` — prediction wrapper used by projections endpoint.

### Tasks
- [x] Generate 2,000-sample synthetic dataset: crop, soil, irrigation, rainfall deviation, temp deviation → yield deviation %.
- [x] Train RandomForestRegressor (scikit-learn) and serialize with pickle.
- [x] Load model at startup; integrate `predict_yield_deviation()` into `GET /api/v1/farmers/me/projections`.
- [x] Weather deviations derived from live forecast DB entries.

---

## Phase 10 — Distress Risk Score ✅ COMPLETE

### Objective
Calculate a multi-pillar 0–100 distress score and map it to severity levels (Stable / Watch / Elevated / High / Critical).

### Deliverables
- `app/distress.py` — 5-component weighted score calculator.
- `GET /api/v1/farmers/me/distress` — live distress score endpoint.
- Dynamic distress card on home dashboard (color-coded by severity level).

### Tasks
- [x] **Weather component** — rainfall deficit ratio → score 0–100.
- [x] **Yield component** — RandomForest yield deviation → score 0–100.
- [x] **Market component** — mandi price vs. historical baseline → score 0–100.
- [x] **Financial component** — obligation coverage ratio shortfall → score 0–100.
- [x] **Urgency component** — days until nearest obligation due date → score 0–100.
- [x] Equal 20% weighting across all 5 components.
- [x] Home screen card color changes dynamically with risk level.

---

## Phase 11 — Government Scheme Matcher ✅ COMPLETE

### Objective
Match applicable government support programs to the farmer's current crop, distress level, and state.

### Deliverables
- `app/schemes.py` — seed 8 national/state schemes on startup.
- `GET /api/v1/farmers/me/schemes` — filtered scheme list by crop and distress score.
- Dynamic scheme cards on Support tab with type badges and Apply Portal links.

### Tasks
- [x] Seed PMFBY, PM-KISAN, e-NAM, KCC, NHM, PSF, Maharashtra Shetkari Nidhi, PMKSY.
- [x] Filter by eligible crops (JSON conditions array) and min distress score threshold.
- [x] Scheme type color badges (Insurance, Credit, Subsidy, Direct Income, etc.).
- [x] Live distress score banner on Support tab.

---

## Phase 12 — Voice Synthesis & Accessibility ✅ COMPLETE (partial)

### Objective
Allow farmers to hear advisories read aloud using the Web Speech API.

### Deliverables
- Mic button on home screen triggers speech synthesis of top advisory.
- Language-aware speech synthesis (uses farmer's selected language locale).

### Tasks
- [x] `window.speechSynthesis.speak()` wired to the Mic button.
- [x] Language-aware `lang` attribute passed to `SpeechSynthesisUtterance`.

---

## Open Items / Future Enhancements

- [ ] Full PWA offline IndexedDB caching with background sync.
- [ ] Real Agmarknet API integration for live mandi prices.
- [ ] GPS auto-detect lat/lon on farm registration.
- [ ] Supabase PostgreSQL deployment migration.
- [ ] Telegram/WhatsApp bot alert channel integration.
- [ ] Recommendation priority ranking with RandomForestClassifier.
