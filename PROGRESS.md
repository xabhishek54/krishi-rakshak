# KrishiRakshak Progress Log

## Summary

| Phase | Title | Status | Tests |
|-------|-------|--------|-------|
| 1 | Foundation & Environment Setup | ✅ Complete | — |
| 2 | Database Models & JWT Authentication | ✅ Complete | 6 passing |
| 3 | Farmer Profile Onboarding & Weather Sync | ✅ Complete | 4 passing |
| 4 | Advisory & Pest Risk Rule Engine | ✅ Complete | 2 passing |
| 5 | Mandi Economics & Net Realization | ✅ Complete | 3 passing |
| 6 | Financial Resilience & Scenario Projections | ✅ Complete | 1 passing |
| 7 | PWA Offline Manifest | ✅ Complete | — |
| 8 | Multi-language Accessibility (5 languages) | ✅ Complete | — |
| 9 | Yield Estimation ML Model | ✅ Complete | — |
| 10 | Distress Risk Score | ✅ Complete | — |
| 11 | Government Scheme Matcher | ✅ Complete | — |
| 12 | Voice Synthesis & Accessibility | ✅ Complete (partial) | — |

**Total backend tests: 14 passing, 0 failing**

---

## Commit History

| Commit | Description |
|--------|-------------|
| `ca02b05` | Initial commit |
| `5e2451c` | Initialize project structure (FastAPI backend + React Vite frontend) |
| `0e6bf9a` | Farm profile onboarding + hyperlocal weather sync |
| `669495b` | Onboarding wizard + live weather summary card |
| `8544dd1` | Dynamic advisory + pest warnings rule engine |
| `a28abda` | Distance-based APMC mandi comparison + DB seeds |
| `2af3834` | Market tab: mandi comparison table, price-crash banner, price-history chart |
| `441e96d` | Financial: crop loan manager, dynamic yield estimator, cash flow tracker |
| `e723bc6` | Multi-crop fix: proper crop selection when switching farms |
| `ad3ac34` | Phases 9-12: ML yield model, distress engine, scheme matcher, translations |

---

## Implemented Features

### Backend (`backend/app/`)
- `main.py` — 30+ REST API endpoints
- `models.py` — 10 SQLAlchemy ORM tables
- `schemas.py` — Pydantic request/response models
- `auth.py` — JWT authentication (bcrypt hash, HS256 token)
- `advisory.py` — Rule engine with crop-stage and rainfall-threshold rules
- `weather.py` — Open-Meteo HTTP provider (7-day forecast sync)
- `mandi.py` — Haversine mandi ranking, price history seeder
- `distress.py` — 5-pillar distress score calculator (0–100)
- `yield_model.py` — RandomForest prediction wrapper
- `train_yield_model.py` — Synthetic dataset generator + training script
- `yield_model.pkl` — Serialized RandomForestRegressor
- `schemes.py` — Government scheme seeder (8 national/state schemes)

### Frontend (`frontend/src/`)
- `App.tsx` — Single-file React app, ~2200 lines
- `translations.ts` — 40+ UI string keys × 5 languages
- Full tab shell: Home, Crops, Market, Alerts, Support, Risk Detail, Profile

### Key UI Flows
- **Register → Onboard → Dashboard** — new farmer flow
- **Farm Selector** — switch between multiple farms in sidebar
- **Crop Selector** — switch between multiple crops per farm
- **Add Farm modal** — soil type, irrigation, GPS coordinates
- **Add Crop modal** — crop type, variety, sowing date, optional image URL
- **Add Obligation modal** — loan/lease/input entries with due date
- **Market tab** — APMC mandi table sorted by net return + price chart
- **Support tab** — Dynamic scheme cards with eligibility filtering
- **Profile tab** — Language switcher (5 languages, persisted)

---

## Architecture Notes

### Database
- Local: SQLite at `backend/kr.db`
- Production-ready: PostgreSQL (set `DATABASE_URL` env var for Supabase)
- All FK relations intact for Supabase migration

### ML Model
- Feature vector: `[crop_encoded, soil_encoded, irrigation_encoded, rainfall_deviation, temp_deviation]`
- Target: yield deviation % (negative = loss, positive = surplus)
- Trained on 2,000 synthetic samples; serialized with `pickle`

### Distress Score Components
| Component | Weight | Signal Source |
|-----------|--------|---------------|
| Weather | 20% | Rainfall deficit (last 7d vs baseline) |
| Yield | 20% | ML yield deviation prediction |
| Market | 20% | Modal price vs 30-day historical mean |
| Financial | 20% | Obligation coverage ratio shortfall |
| Urgency | 20% | Days until nearest due obligation |

### Language Support
| Language | Code | Coverage |
|----------|------|----------|
| English | `english` | Full |
| Hindi | `hindi` | Full |
| Marathi | `marathi` | Full |
| Bengali | `bengali` | Full |
| Odia | `odia` | Full |

---

## Next Steps (Pending)
- Full PWA offline IndexedDB caching with background sync
- Real Agmarknet API integration for live mandi prices
- GPS auto-detect lat/lon on farm registration
- Supabase PostgreSQL deployment migration
- Telegram/WhatsApp bot alert channel integration
