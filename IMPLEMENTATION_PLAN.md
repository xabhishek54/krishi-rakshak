# KrishiRakshak — Implementation Plan (Current)

## Status: Active Development

Last updated: 2026-08-23T12:05 IST

---

## APIs Configured

| Service | Key | Status |
|---------|-----|--------|
| Gemini 3.1 Flash Lite | `AQ.Ab8RN6J_1kwgFChbLdh03PsSEJV3x4L2AYKAMv03Ydpt2nsExQ` | ✅ Working |
| Agmarknet (data.gov.in) | `579b464db66ec23bdd000001c5dbc8cb04004c3a7dbfdbe429d6a773` | ⚠ Slow (fallback to seeded data) |
| Open-Meteo | No key required | ✅ Working (live Nashik weather fetched) |
| MyMemory Translation | No key required | ✅ Working |

> Gemini model resolved: "Gemini 3.5 Flash Lite" (user name) → `gemini-3.1-flash-lite` (actual API ID).
> Text-in, text-out. Confirmed via API listing and test prompt. Never branded as "Gemini" in UI.

---

## Completed Phases

### Phase 1–10 (Backend Core)
- ✅ FastAPI + SQLite backend with JWT auth
- ✅ All SQLAlchemy models: Farmer, Farm, Crop, Mandi, MarketPrice, Advisory, Alert, Scheme, DistressScore, FinancialObligation, WeatherForecast, WeatherObservation
- ✅ RandomForest yield ML model in `yield_model.py`
- ✅ Advisory + pest rule engine in `advisory.py` + `rules.json`
- ✅ Mandi net realization engine (Haversine distance) in `mandi.py`
- ✅ Financial resilience projections (3 scenarios: normal/current/stress) in `distress.py`
- ✅ Distress score (5-pillar: weather 25%, market 25%, yield 20%, financial 20%, urgency 10%)
- ✅ JWT auth register/login endpoints

### Phase 11 — Scheme Ranker
- ✅ 14 government schemes in catalogue (`schemes.py`)
- ✅ 5-factor relevance scoring: crop type 40% + distress level 30% + state 15% + irrigation 10% + farm size 5%
- ✅ `is_recommended` flag on top ⅓ of scored schemes per farmer

### Phase 12 — Voice Playback
- ✅ Web Speech API with locale-matched voices (en-IN, hi-IN, mr-IN, bn-IN, or-IN)
- ✅ `buildVoiceText()` builds context-aware speech script from active tab content
- ✅ `askGemini()` function in `voice.ts` calls Gemini API with farmer context

### Phase 13 — Toast Notifications
- ✅ `Toast.tsx` + `useToast()` hook with 4 severity levels
- ✅ All browser `alert()` calls replaced with toast

### Phase 14 — Map / Location
- ✅ `MapPicker.tsx` — Leaflet.js + OpenStreetMap (no API key needed)
- ✅ `india_locations.ts` — full state/district hierarchy for all Indian states
- ✅ Farm registration: GPS pin on map or manual state/district selection

### Phase 15 — DB Auto-Migration
- ✅ `migrations.py` — idempotent startup ALTER TABLE runner
- ✅ Covers: crops.image_url, crops.expected_harvest_date, farms.state/district/name, farmers.risk_profile/language, market_prices.source

### Phase 16 — Multi-Crop Display
- ✅ `allCrops` state — loads all farms' crops in parallel
- ✅ Crop tab: card grid with stage badge, farm label, per-crop advisory timeline
- ✅ Market tab: crop switcher dropdown for individual price comparison

### Phase 17 — Bug Fixes
- ✅ Mandi distance: uses nearest farm to mandi (Haversine), not always farm[0]
- ✅ Distress narrative: dynamic text built from component scores
- ✅ Navbar scroll: h-screen layout fix prevents nav scrolling
- ✅ Scheme seeder: name-based dedup — all 14 schemes always seeded

### Phase 18 — Translation Layer
- ✅ `translate.ts` — MyMemory API + localStorage cache (TTL 7 days)
- ✅ `translatedAdvisories` state: useEffect translates advisory text on language change
- ✅ `translatedAlerts` state: useEffect translates alert reason on language change
- ✅ All advisory/alert render points use translated arrays (with fallback to raw)
- ✅ Dynamic advisory text translated before voice playback

### Phase 19 — Instant Voice Q&A (Farm AI)
- ✅ Removed modal-based voice UI entirely
- ✅ `handleInstantMic()`: tap → SpeechRecognition → transcript → Farm AI → translate → speak
- ✅ `voiceState` FSM: idle → listening → thinking → speaking → idle
- ✅ Floating card overlay with waveform animation, transcript, AI answer, "Play again"
- ✅ All "Gemini" branding removed from UI — uses "Farm AI" / "Farm Advisor"
- ✅ Locale-correct SpeechRecognition: en-IN, hi-IN, mr-IN, bn-IN, or-IN
- ✅ Fallback to advisory playback if SpeechRecognition unavailable

### Phase 20 — Agmarknet Background Fetch
- ✅ `background_fetch_and_store()` in `agmarknet.py` — async with `asyncio.to_thread()`
- ✅ Wired to startup via `asyncio.create_task()` — non-blocking, fires at server start
- ✅ `POST /api/v1/market/refresh-live-prices` — manual trigger endpoint
- ✅ `market_prices.source` column: `'seeded'` | `'agmarknet_live'`
- ✅ Migration for source column added to `migrations.py`
- Crops fetched: tomato, onion, wheat, potato, maize

### Phase 21 — Community District Risk Map
- ✅ `GET /api/v1/community/district-risk` — SQL aggregate distress by district
  - Joins Farmer → Farm → DistressScore (latest per farmer via subquery)
  - Returns: district, state, avg_score, risk_level, farmer_count, lat, lon
  - Fully anonymised — no individual data exposed
- ✅ `community` tab added to frontend TabType
- ✅ District cards: coloured score circle + animated progress bar + risk badge
- ✅ Legend: Critical/High/Elevated/Watch/Stable colour coding
- ✅ Sidebar nav + mobile bottom nav (🗺️ Map)
- ✅ Verified live: Nashik 35.8/100 (Watch), Rourkela 26.5/100 (Watch)

### Phase 22 — Advisory Engine Expansion
- ✅ New condition types in rule evaluator: `humidity_min`, `rain_probability_min`, `temperature_min`
- ✅ Empty `conditions: {}` = unconditional stage-based advisory (always fires)
- ✅ `rules.json` expanded to 12 advisory rules + 6 pest rules:
  - Tomato: Fruit Development (humidity/rain_probability/unconditional), Vegetative, Flowering
  - Onion: Vegetative Growth (unconditional/humidity/rain_probability), Bulb Development
  - Wheat: Germination (unconditional/rain_probability), Tillering, Flowering
  - General: rain >30mm drainage, heat >40°C all crops
- ✅ Stage matching: bidirectional substring (`stage in crop_stage OR crop_stage in stage`)
- ✅ Advisory reason fallback to `explanation` field

### Phase 23 — Distress Score Detail View
- ✅ `risk-detail` tab redesigned with:
  - Dark gradient overall score card (score /100 + animated colour bar)
  - Formula label: Weather(25%) + Market(25%) + Yield(20%) + Financial(20%) + Urgency(10%)
  - 5 expandable pillar cards, each with:
    - Progress bar (colour-coded: blue/orange/green/red/purple)
    - Weight label and current score
    - Expandable `<details>`: what it measures, calculation formula, common causes
  - Financial scenarios table: Normal / Current / Stress −30% with ₹ values and coverage ratio
  - Obligation cards with days-left countdown, urgent (≤7 days) highlighted in red

### Phase 24 — Demo Account Seeder
- ✅ `backend/seed_demo.py` — pure API round-trip, zero hardcoded advisories:
  1. Login `+919876543210` / `demo1234` (registers if not exists)
  2. POST `/api/v1/farmers/me/farms` × 2 → Nashik Main Farm + Pimpalgaon Plot
  3. POST `/api/v1/farms/{id}/crops` × 3 → Tomato + Onion + Wheat
  4. POST `/api/v1/farmers/me/obligations` × 2 → ₹45,000 KCC + ₹12,000 input credit
  5. POST `/api/v1/weather/Nashik_Maharashtra/refresh` → Open-Meteo live weather
  6. GET `/api/v1/advisories` → rule engine fires → 3 real advisories generated
  7. GET `/api/v1/farmers/me/distress` → 40.4/100 Elevated (real computation)
- ✅ All data is real — generated by the engine, not seeded text

---

## Backlog (Next)

### Phase 25 — Yield Calculator
**Objective:** Per-crop interactive yield estimator with adjustable parameters.

**Architecture:**
- Frontend: calculator card on Crop tab with: crop selector, area (acres), rainfall slider, soil type, irrigation toggle
- Backend: `POST /api/v1/yield/estimate` — calls `predict_yield_deviation()` from `yield_model.py`
- Output: estimated yield (quintals/acre), projected revenue at current mandi price, best/worst case range

**Deliverables:**
- [ ] `POST /api/v1/yield/estimate` accepting: crop_type, area, rainfall_mm, soil_type, irrigation, stage
- [ ] Frontend yield calculator with sliders and crop selector
- [ ] Display: yield q/acre, revenue ₹, comparison bar vs baseline

### Phase 26 — PWA Offline Cache
**Objective:** Service worker + IndexedDB offline capability.

**Architecture:**
- `public/sw.js` — cache-first for static assets, network-first for API
- `manifest.json` with app icons for install prompt
- IndexedDB via `idb` library: caches last advisory/weather/mandi/distress responses
- Offline banner: "Last synced X minutes ago"

**Deliverables:**
- [ ] `public/sw.js` + registration in `index.html`
- [ ] `public/manifest.json`
- [ ] Offline indicator in header
- [ ] `db.ts` — IndexedDB write on every API fetch

---

## Build Status
- `npm run build` → ✓ 0 TypeScript errors
- `pytest tests/` → 14 passed, 0 failed
- DB: 14 schemes seeded, all migrations applied
- Demo account: `+919876543210 / demo1234` — Ramesh Patil, Nashik Maharashtra
  - 2 farms, 3 crops, 2 obligations, distress 40.4/100 Elevated, 3 real advisories

---

## Phase 26 Completed — PWA (2026-08-23)

### Service Worker (`public/sw.js`)
- Cache-first strategy for app shell (HTML/CSS/JS assets)
- Network-first with **IndexedDB fallback** for 7 key API routes:
  - `/api/v1/advisories`, `/api/v1/farmers/me/distress`, `/api/v1/weather/*`
  - `/api/v1/mandis/compare`, `/api/v1/farmers/me/schemes`, `/api/v1/alerts`
  - `/api/v1/farmers/me/projections`
- Stale responses include `_offline: true` and `_age_minutes` field
- Message handler: `GET_LAST_SYNC` returns last DB write timestamp
- Background update: `skipWaiting()` on new SW install

### Manifest (`public/manifest.json`)
- `display: standalone`, `theme_color: #4a7c59`
- 8 PWA icon sizes (72–512px) from branded wheat+shield icon
- Shortcuts: Advisories (`/?tab=home`) and Market (`/?tab=market`)
- Full Apple meta tags for iOS Safari install

### `index.html` Updates
- Complete SEO: title, description, keywords, Open Graph
- Manifest link + Apple meta tags
- Google Fonts: Inter + Outfit (preconnect)
- SW registration: `navigator.serviceWorker.register('/sw.js')` on window load, with 60s update polling

### Offline Banner (App.tsx)
- `isOnline` state (`navigator.onLine`)
- `window.addEventListener('online' / 'offline')` for real-time detection
- Fixed-top dark banner with animated red pulse dot
- Shows: `"You're offline — showing cached data · Last synced HH:MM:SS"`

### Phase 25 Completed — Yield Calculator
- `POST /api/v1/yield/estimate` endpoint returning:
  - ML-predicted yield deviation (RandomForest)
  - Estimated yield q/acre and total q
  - Projected gross revenue at live mandi price
  - Three scenarios (best +15%, base, worst −15%)
- UI on Crop tab: crop/area/soil/irrigation inputs + rainfall slider
- Results: 3-column stats grid + revenue card + scenario bar chart

### Build Status (2026-08-23)
- `npm run build` → ✓ 0 TS errors
- All React hooks at top-level component scope (no hooks-in-switch violations)
- SW registered and caching on page load
- Demo account verified: `+919876543210` / `demo1234`

### Phase 27 Completed — Grouping, RADIO & Seeding Upgrades (2026-08-23)
- **Crop Grouping**: Combined multiple plantings of the same crop type under a single type card, with expandable details per planting.
- **Inline Crop Deletions**: Allowed deleting plantings directly from the details list inside the My Crops tab.
- **RADIO Voice**: Renamed voice assistant to RADIO/KrishiRadio, replaced mic with Radio icon, and added fallback toast notifications for transcription/network errors.
- **Header Refresh Icon**: Added a manual sync button in the global top header, and background auto-refresh checking (15m interval) on startup.
- **Upgraded Demo Seeder**: Re-architected seeder to write directly to SQLite via SQLAlchemy on startup, seeding 5 farms, 6 crops (with duplicate Tomato plantings to test grouping), and 4 obligations.
