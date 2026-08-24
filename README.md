# KrishiRakshak Early-Warning & Response System

KrishiRakshak is an early-warning, risk-intelligence, and intervention system that integrates hyperlocal weather/crop risk, mandi economics, and financial obligations to predict farm distress and prioritize interventions.

---

## Running the Project

Follow these steps to set up and run both the backend API and frontend PWA.

### 1. Backend Setup (FastAPI)

Open a terminal at the project root directory and run the following commands:

```bash
# Navigate to the backend directory
cd backend

# Create a Python virtual environment
python3 -m venv .venv

# Activate the virtual environment
source .venv/bin/activate

# Install the required dependencies
pip install -r requirements.txt

# Start the FastAPI development server
uvicorn app.main:app --reload
```

Once started, the backend server will run at `http://127.0.0.1:8000`. You can access the interactive Swagger documentation at `http://127.0.0.1:8000/docs`.

*Note: On Windows, activate the virtual environment using `.venv\Scripts\activate` instead.*

---

### 2. Frontend Setup (React + Vite)

Open a new terminal window at the project root directory and run the following commands:

```bash
# Navigate to the frontend directory
cd frontend

# Install Node dependencies
npm install

# Start the Vite development server
npm run dev
```

Once started, the frontend application will be accessible at `http://localhost:5173`. It is designed mobile-first, but is fully responsive across tablet and desktop breakpoints.

# Backend
cd backend && .venv/bin/python -m uvicorn app.main:app --reload --port 8000

# Frontend (new terminal)
cd frontend && npm run dev -- --port 5173
