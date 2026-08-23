# KrishiRakshak — Implementation Plan (Current)

## Status: Active Development

Last updated: 2026-08-23

---

## APIs Configured

| Service | Key | Status |
|---------|-----|--------|
| Gemini 3.1 Flash Lite | `AQ.Ab8RN6J_1kwgFChbLdh03PsSEJV3x4L2AYKAMv03Ydpt2nsExQ` | ✅ Working |
| Agmarknet (data.gov.in) | `579b464db66ec23bdd000001c5dbc8cb04004c3a7dbfdbe429d6a773` | ⚠ Slow (fallback to seeded data) |
| Open-Meteo | No key | ✅ Working |
| MyMemory Translation | No key | ✅ Working |

> Gemini model resolved: "Gemini 3.5 Flash Lite" (user name) → `gemini-3.1-flash-lite` (actual API ID).
> Text-in, text-out. Confirmed via API listing and test prompt.

---

## Completed Phases

### Phase 1–10 (Backend Core)
- ✅ FastAPI + SQLite backend with JWT auth
- ✅ All SQLAlchemy models: Farmer, Farm, Crop, Mandi, MarketPrice, Advisory, Alert, Scheme, DistressScore, FinancialObligation, WeatherForecast
- ✅ RandomForest yield ML model
- ✅ Advisory + pest rule engine
- ✅ Mandi net realization engine (Haversine distance)
- ✅ Financial resilience projections (3 scenarios)
- ✅ Distress score (5-pillar, 0–100)
- ✅ JWT auth register/login

### Phase 11 — Scheme Ranker
- ✅ 14 schemes in catalogue
- ✅ 5-factor relevance scoring (crop 40% + distress 30% + state 15% + irrigation 10% + farm size 5%)
- ✅ `is_recommended` flag on top ⅓

### Phase 12 — Voice Playback
- ✅ Web Speech API with locale-matched voices (en-IN, hi-IN, mr-IN, bn-IN, or-IN)
- ✅ `buildVoiceText()` reads actual content per active tab
- ✅ Gemini Q&A scaffold with `askGemini()` function

### Phase 13 — Toast Notifications
- ✅ `Toast.tsx` + `useToast()` hook
- ✅ All `alert()` calls replaced

### Phase 14 — Map/Location
- ✅ `MapPicker.tsx` — Leaflet.js + OpenStreetMap (no API key)
- ✅ `india_locations.ts` — full state/district hierarchy
- ✅ Farm registration with map pin or manual state/district

### Phase 15 — DB Auto-Migration
- ✅ `migrations.py` — idempotent startup runner
- ✅ Covers: crops.image_url, farms.state/district/name, farmers.risk_profile/language

### Phase 16 — Multi-Crop Display
- ✅ `allCrops` state — loads all farms' crops in parallel
- ✅ Crop tab: card grid with stage badge, farm label, per-crop advisory
- ✅ Market tab: crop switcher dropdown

### Phase 17 — Bug Fixes
- ✅ Mandi distance: nearest-farm selection instead of first-farm
- ✅ Distress narrative: dynamic from component scores (no hardcoded loan text)
- ✅ Navbar scroll: h-screen layout fix
- ✅ Scheme seeder: name-based dedup (all 14 always seeded)

### Phase 18 — Translation Layer
- ✅ `translate.ts` — MyMemory API + localStorage cache
- ✅ Dynamic advisory text translated before speaking

---

## Current Phase: Voice Q&A with Gemini

### Phase 19 — Gemini 3.1 Flash Lite Voice Q&A

**Objective:** Farmer speaks a farming question in any language → Gemini answers using their actual farm data → answer spoken aloud in their language.

**Architecture:**
```
Mic button → SpeechRecognition (browser-native)
→ Question text
→ Gemini 3.1 Flash Lite API
   (system prompt includes: crops, farms, weather, distress, advisories)
→ Answer text (English)
→ translateText() → farmer's language
→ speakText() → Web Speech API TTS
```

**Deliverables:**
- [ ] Update `voice.ts` with real API key + model (`gemini-3.1-flash-lite`)
- [ ] Add voice Q&A modal to `App.tsx` (mic button, listening state, transcript display)
- [ ] Wire SpeechRecognition → askGemini → speakText pipeline
- [ ] Show transcript + Gemini answer text in modal

**Constraints (per features.md §17):**
- Scoped to 3–4 supported intents: irrigation, mandi, pest, scheme
- Gemini never makes agricultural decisions — receives structured data, phrases answers only
- Voice input optional — farmer can also type their question

---

## Next Phases (Backlog)

### Phase 20 — Agmarknet Background Fetch
- On startup: async background task fetches live prices for tomato, wheat, onion
- Cache to `market_prices` table
- "Live" badge when data < 24h old
- Endpoint: `POST /api/v1/market/refresh-live-prices`

### Phase 21 — Community Risk Map
- District heatmap: aggregate DistressScore by location_id
- Leaflet.js choropleth (no new API key needed)
- 🔴 High / 🟠 Medium / 🟢 Stable color coding

### Phase 22 — PWA Offline Cache
- Service worker caches app shell
- IndexedDB: last advisory, weather, mandi, farmer profile
- "Last updated X hours ago" staleness indicator

---

## Build Status
- `npm run build` → ✓ 1.82s, 0 TypeScript errors
- `pytest tests/` → 14 passed, 0 failed
- DB: 14 schemes, all migrations applied
