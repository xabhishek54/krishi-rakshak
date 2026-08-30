# 🌾 KrishiRakshak (कृषिरक्षक) — Hyperlocal Farm Risk Intelligence & Advisory System

**KrishiRakshak** is an intelligent, multi-lingual early-warning, farm risk-intelligence, and intervention system designed for smallholder farmers and agriculture officers in India. 

It unifies **hyperlocal weather analytics**, **crop disease forecasting**, **APMC mandi economics**, and **farm financial debt safety** into a single actionable dashboard — accessible via voice and text across **5 Indian languages** (English, Hindi, Marathi, Bengali, Odia).

---

## 🌟 Key Features

- 🌾 **Hyperlocal Risk & Disease Early Warning**: Real-time distress scoring based on humidity, rainfall, temperature, and market crashes (e.g., Late Blight, Purple Blotch alerts).
- 💡 **Multi-Crop Advisory & MCDA Engine**: Multi-Criteria Decision Analysis evaluating soil fit, irrigation compatibility, weather score, and market prices across **12 crop varieties** (tomato, wheat, onion, rice, maize, soybean, grapes, banana, sugarcane, cotton, potato, chilli).
- 📊 **Smart APMC Mandi Selling Advisor**: Calculates net realization per quintal after deducting transport and handling fees to recommend the highest-profit mandi.
- 💳 **Farm Money Health & Debt Safety Index**: Evaluates net surplus, upcoming obligations, multi-crop diversification score, and safe borrowing capacity.
- 🏛️ **Government Support & Subsidy Matcher**: Automatically matches farmers with relevant central/state schemes and KCC loan options.
- 🎙️ **Voice AI Assistant & Regional Translation**: Embedded Gemini voice Q&A, Web Speech playback, and server-side translation proxy for 100% native digit and script rendering.
- 🚜 **One-Click Instant Demo Accounts**: Instant single-click authentication for demo Farmer & Agro Officer accounts.

---

## 🛠️ Technical Architecture & Stack

### Backend
- **Framework**: Python 3.10+ & FastAPI
- **Database**: SQLite (local zero-config) / PostgreSQL (production) with SQLAlchemy ORM
- **ML & Analytics**: Scikit-Learn (yield & profit deviation models), Pandas, NumPy
- **Authentication**: OAuth2 / JWT with bcrypt hashing
- **Translation & Voice**: Server-side translation proxy (`/api/v1/translate`), Web Speech API, Google Gemini AI (`gemini-3.1-flash-lite`)

### Frontend
- **Framework**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS (modern, mobile-first responsive UI)
- **Mapping & Charts**: Leaflet.js, React-Leaflet, Recharts
- **Icons**: Lucide React

---

## 🚀 Quick Start Guide

Follow these simple steps to set up and run KrishiRakshak on your local machine.

### Prerequisites
Make sure you have installed:
- **Python 3.10+** ([Download Python](https://www.python.org/downloads/))
- **Node.js 18+** & npm ([Download Node.js](https://nodejs.org/))

---

### Step 1: Clone the Repository

```bash
git clone https://github.com/xabhishek54/krishi-rakshak.git
cd krishi-rakshak
```

---

### Step 2: Backend Setup (FastAPI)

1. Open a terminal in the project root directory and navigate to `backend`:
   ```bash
   cd backend
   ```

2. Create and activate a Python virtual environment:
   - **Linux / macOS**:
     ```bash
     python3 -m venv .venv
     source .venv/bin/activate
     ```
   - **Windows (Command Prompt / PowerShell)**:
     ```cmd
     python -m venv .venv
     .venv\Scripts\activate
     ```

3. Install backend dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Start the FastAPI backend server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

> 💡 **Automatic Setup**: On first startup, KrishiRakshak automatically creates `krishirakshak.db`, runs database migrations, and seeds mandis, government schemes, and rich demo farmer profiles! No manual database configuration required.

The backend API will run at **`http://localhost:8000`**.  
Interactive API Documentation (Swagger UI): **`http://localhost:8000/docs`**

---

### Step 3: Frontend Setup (React + Vite)

1. Open a **new terminal window** in the project root directory and navigate to `frontend`:
   ```bash
   cd frontend
   ```

2. Install Node.js dependencies:
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```

The application will launch automatically at **`http://localhost:5173`**.

---

## 🔑 Demo Login Credentials

You can log in manually using the test credentials below, or simply click the **🚜 Try Demo Farmer Account** or **🏛️ Try Demo Agro Officer Account** buttons on the login screen for instant single-click authentication!

| Role | Phone Number | Password |
|---|---|---|
| **Farmer Account** | `9876543210` | `farmer123` |
| **Agro Officer Account** | `9000000000` | `officer123` |

---

## ⚙️ Environment Variables (Optional)

### Backend (`backend/.env`)
Create a `.env` file inside the `backend/` directory if you wish to override defaults:

```env
DATABASE_URL=sqlite:///./krishirakshak.db
SECRET_KEY=your_custom_secret_key_here
PORT=8000
```

### Frontend (`frontend/.env`)
Create a `.env` file inside the `frontend/` directory:

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

*(Note: If `VITE_GEMINI_API_KEY` is omitted, the app will gracefully fall back to local advisory synthesis and Web Speech playback).*

---

## 🧪 Verification & Testing

### Running Frontend Tests
```bash
cd frontend
npm run test
```
*(Executes Vitest suite verifying digit localization, currency formatting, and translation logic).*

### Building for Production
```bash
# Frontend
cd frontend
npm run build

# Backend
cd backend
python -m pytest tests/
```

---

## 📁 Repository Structure

```
krishi-rakshak/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app & auto-seeding startup
│   │   ├── advisory.py          # Agronomic rule engine
│   │   ├── translate_routes.py  # Server-side translation proxy
│   │   ├── mandi.py             # APMC mandi pricing & distance logic
│   │   ├── distress.py          # Multi-dimensional distress risk model
│   │   ├── yield_model.py       # Scikit-learn yield deviation model
│   │   ├── credit.py            # KCC & financial debt safety evaluator
│   │   └── schemes.py           # Subsidies & scheme matcher
│   ├── seed_demo.py             # Rich demo data seeder
│   └── requirements.txt         # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── App.tsx              # Main dashboard application
│   │   ├── translate.ts         # Multi-lingual dictionary & API fallback
│   │   ├── voice.ts             # Voice speech synthesis & Gemini Q&A
│   │   ├── i18n.ts              # Native digit & currency formatting
│   │   └── Translated.tsx       # String wrapper component
│   └── package.json             # Frontend dependencies
└── README.md                    # Project documentation
```

---

## 📜 License & Acknowledgments

Developed for the **Smart India Hackathon (SIH) — Farmer Advisory & Early Warning System**. Built with open-source tools and public Indian agricultural datasets (APMC Mandi Agmarknet data, Open-Meteo weather forecasts).
