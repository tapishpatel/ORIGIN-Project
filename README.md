# 🌿 AeroHealth — Personalized Weather & Environmental Health Intelligence

[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg)](https://fastapi.tiangolo.com)
[![React 18](https://img.shields.io/badge/React-18-61dafb.svg)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-8.2-646cff.svg)](https://vitejs.dev)
[![Live Open--Meteo](https://img.shields.io/badge/Feeds-Open--Meteo%20Live-10b981.svg)](https://open-meteo.com)
[![Design System](https://img.shields.io/badge/Design-Apple%20Weather%20%2B%20Health-f8fafc.svg)](https://apple.com)

> **Generic AQI numbers treat everyone the same. AeroHealth doesn't.**  
> A 30-year-old marathon runner and a 67-year-old with cardiovascular disease breathing the exact same air face radically different biological threats. AeroHealth bridges the gap between environmental telemetry and clinical vulnerability.

---

## 🌟 Overview & Core Innovation

AeroHealth continuously ingests real-time atmospheric data (temperature, humidity, wind, UV index, PM2.5, PM10, NO2, O3) and evaluates it against an individual's unique health profile (clinical conditions, age group, occupational exposure, and baseline sensitivity). 

### The Two-Tier Clinical Safety Architecture
1. **Tier 1: Deterministic Clinical Risk Engine (Safety Net)**
   - Calculates personalized composite risk scores (`0–100`) using clinically verified weighted multipliers (e.g., Asthma `1.50×`, Cardiac `1.40×`, Vulnerable Age `1.30×`, Outdoor Worker Exposure `1.25×`).
   - Completely eliminates AI hallucination risk in health-critical decisions.
2. **Tier 2: Empathetic Plain-English Communication (Generative AI)**
   - Generates contextual, 1-to-2 sentence plain-English advisories and prioritized action checklists (N95 mask guidance, hydration, inhaler readiness, safe outdoor windows).
   - Powered by **Qwen2.5-72B-Instruct** / Groq / Gemini, with a zero-delay deterministic heuristic fallback for offline or zero-quota resilience.

---

## 🎨 Apple Weather + Apple Health Design System

AeroHealth features a minimalist aesthetic inspired by Apple Weather and Apple Health:

- **Neutral Canvas**: Warm off-white background (`#f8fafc` / `#f1f5f9`), crisp white cards (`#ffffff`) with subtle 1px border (`rgba(0,0,0,0.06)`), and charcoal typography (`#0f172a`, `#334155`).
- **Semantic Muted Risk Tokens**: Soft Sage (`#10b981`), Soft Amber (`#f59e0b`), Muted Coral (`#f97316`), and Muted Crimson (`#ef4444`).
- **Information Density Reduction (40–60%)**: Replaced walls of text with circular radial gauges, interactive hourly forecast tiles, visual multiplier chips, and progressive disclosure cards.
- **Atmospheric Visual Backdrop**: Subtle misty atmospheric backdrop with delicate script accent *"Clearer days, healthier you"*.

---

## ⚡ Key Features

| Feature | Description |
| :--- | :--- |
| **Atmospheric Hero Card** | Live geolocation (`📍 Bhopal, India`), real-time weather metrics (Humidity, Wind, UV Index, Visibility), and live freshening ticker (`⏱ Updated Xs ago`). |
| **Your Health Today** | Circular radial arc gauge displaying personalized composite risk (`62 / 100`) and clinical rationale. |
| **Air Quality Meter** | Semi-circular gauge showing US AQI and category (`Unhealthy for sensitive groups`) with pollutant breakdown tiles (`PM2.5`, `PM10`, `NO2`, `O3`). |
| **Hourly & 7-Day Forecast** | Horizontal scrolling forecast carousel showing temperatures, weather icons, and AQI status pills. |
| **Why is my risk different?** | Explainability matrix displaying active environmental contributors alongside personalized health multipliers. |
| **"Same air. Different risk."** | Side-by-side comparative analysis demonstrating how identical atmospheric conditions create vastly different risks for different personas. |
| **Interactive What-If Simulator** | Real-time sliders allowing users to stress-test their risk response to severe AQI spikes or heatwaves. |
| **Weekly Trends & Trajectory** | Smooth SVG risk curve, threshold safety marker, environmental factor comparison (+58% PM2.5), and risk distribution donut chart. |
| **3-Part Structured Alerts** | Every alert clearly answers: *1. What happened?*, *2. Why it matters?*, and *3. What should I do?*. |
| **Real Gmail SMTP Dispatches** | Built-in email dispatch engine delivering real formatted security/health alerts to the user's inbox via Gmail SMTP. |
| **3-Step Health Profile Onboarding** | Apple Health-style progressive setup (Demographics ➔ Clinical Conditions ➔ Sensitivity & Notification channels). |

---

## 🏗️ System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        AEROHEALTH FRONTEND                             │
│   Modular React Vite App (src/)   │   Embedded Single-File SPA (app.html) │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / REST / Bearer JWT
┌───────────────────────────────────▼────────────────────────────────────┐
│                       FASTAPI BACKEND ENGINE                           │
│  - REST Routers: /auth, /api/dashboard, /api/history, /api/advisory    │
│  - Storage: MongoDB Atlas (with zero-config In-Memory resilience fallback) │
│  - Background Worker: APScheduler 15-minute periodic evaluator         │
│  - Outbound Gateways: Gmail SMTP (TLS 587) + Fast2SMS                  │
└──────────────┬────────────────────┬────────────────────┬───────────────┘
               │                    │                    │
┌──────────────▼──────┐ ┌───────────▼──────────┐ ┌───────▼───────────────┐
│  Open-Meteo APIs    │ │ Clinical Risk Engine │ │ Generative AI Advisory │
│  - Live Weather     │ │ - Asthma Multiplier  │ │ - Qwen 2.5 72B / Groq │
│  - Real-time AQI    │ │ - Cardiac Multiplier │ │ - Clinical Heuristic  │
│  (Zero API Key Req) │ │ - Age Demographic    │ │   Fallback Pipeline   │
└─────────────────────┘ └──────────────────────┘ └───────────────────────┘
```

---

## 📁 Repository Structure

```
ORIGIN-Project/
├── backend/
│   ├── app/
│   │   ├── config.py              # Central environment settings (Pydantic Settings)
│   │   ├── main.py                # Modular FastAPI application entrypoint
│   │   ├── db/
│   │   │   ├── client.py          # MongoDB Atlas + In-Memory database wrapper & seeders
│   │   │   └── models.py          # Pydantic data schemas
│   │   ├── routes/
│   │   │   ├── auth.py            # OAuth & Demo Persona login endpoints
│   │   │   ├── user.py            # Profile update & retrieval endpoints
│   │   │   ├── weather.py         # Dashboard & comparative persona endpoints
│   │   │   ├── advisory.py        # Scenario simulator endpoint
│   │   │   └── history.py         # 7-day snapshots & alert audit log endpoints
│   │   └── services/
│   │       ├── aqi.py             # Open-Meteo Air Quality ingestion
│   │       ├── weather.py         # Open-Meteo Weather ingestion
│   │       ├── risk_engine.py     # Deterministic clinical multiplier engine
│   │       ├── llm.py             # LLM advisory synthesis + heuristic fallback
│   │       ├── notify.py          # Gmail SMTP & SMS dispatch service
│   │       └── scheduler.py       # APScheduler automated background monitor
│   ├── server.py                  # Standalone all-in-one dev server (Python stdlib/FastAPI)
│   ├── test_api.py                # Automated 12-stage system verification test suite
│   ├── requirements.txt           # Python dependencies
│   └── .env.example               # Template environment configuration
├── frontend/
│   ├── index.html                 # Vite HTML entry point
│   ├── package.json               # Frontend dependencies & scripts
│   ├── vite.config.js             # Vite configuration
│   ├── public/
│   │   └── app.html               # Zero-dependency embedded SPA (served at /app)
│   └── src/
│       ├── main.jsx               # React DOM bootstrap
│       ├── App.jsx                # Core application container & state management
│       ├── index.css              # Global Apple-inspired design system tokens
│       ├── api/
│       │   └── client.js          # Unified API client with JWT handling
│       └── components/
│           ├── Navbar.jsx         # Segmented navigation with Live badge & notification bell
│           ├── WeatherCard.jsx    # Weather hero with atmospheric gradient & metric chips
│           ├── AQIGauge.jsx       # Semi-circular AQI meter & pollutant breakdown
│           ├── AdvisoryCard.jsx   # Health risk radial arc, explainability, & simulator
│           ├── HistoryTrends.jsx  # SVG risk curve, factor comparisons, & donut chart
│           ├── LocationSelector.jsx # Geolocation & city search
│           ├── NotificationDrawer.jsx # Slide-out alerts timeline & live triggers
│           ├── ProfileModal.jsx   # 3-step progressive clinical onboarding
│           └── OnboardingForm.jsx # Standalone profile completion form
├── run_dev.bat                    # One-click Windows launch script
├── run_dev.ps1                    # PowerShell execution script
└── README.md                      # Comprehensive project documentation
```

---

## 🚀 Quick Start & Installation

### Prerequisites
- **Python 3.10+**
- **Node.js 18+** & **npm**

### Option A: One-Click Launch (Windows)
Double-click `run_dev.bat` or run:
```powershell
.\run_dev.bat
```
This automatically starts the backend server on `http://127.0.0.1:8000/` and opens the web application in your default browser.

---

### Option B: Manual Setup

#### 1. Backend Setup
```powershell
# Navigate to the backend directory
cd backend

# (Optional) Create and activate a virtual environment
python -m venv venv
.\venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# (Optional) Configure environment variables
copy .env.example .env

# Run the backend server
python server.py
# OR: uvicorn app.main:app --reload --port 8000
```
- Embedded Web App: **`http://127.0.0.1:8000/app`** (or `http://127.0.0.1:8000/`)
- Interactive Swagger API Documentation: **`http://127.0.0.1:8000/docs`**

#### 2. Frontend Setup (Modular React / Vite)
```powershell
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```
- Modular React Application: **`http://localhost:5173`**

---

## ⚙️ Environment Variables (`backend/.env`)

| Variable | Default | Description |
| :--- | :--- | :--- |
| `PORT` | `8000` | HTTP port for backend server |
| `MONGO_URI` | `""` | MongoDB Atlas connection string (auto-falls back to In-Memory mode if blank) |
| `MONGO_DB_NAME` | `weather_health_db` | MongoDB database name |
| `HUGGINGFACE_API_KEY` | `""` | HuggingFace Inference API token for Qwen 2.5 72B advisory synthesis |
| `SMTP_USER` | `tornovdutta@gmail.com` | Gmail address for dispatching live alerts |
| `SMTP_PASSWORD` | `""` | Gmail App Password (16 characters) |
| `GOOGLE_CLIENT_ID` | `""` | Google Cloud Console OAuth 2.0 Client ID |
| `GOOGLE_CLIENT_SECRET`| `""` | Google Cloud Console OAuth 2.0 Client Secret |
| `JWT_SECRET` | `aerohealth-super-secret-key-2026` | Secret key used for signing JWT tokens |

---

## 📡 REST API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` or `/app` | Serves the embedded Apple Weather + Health web application |
| `GET` | `/docs` | Interactive Swagger / OpenAPI documentation |
| `GET` | `/auth/personas` | Lists pre-configured demo personas (Aditi, Rajiv, Karan, Aarav) |
| `POST` | `/auth/demo-login` | Authenticates as a selected persona and returns a session token |
| `GET` | `/auth/google/login` | Initiates Google OAuth 2.0 authorization flow |
| `GET` | `/api/dashboard` | Returns live weather, AQI, clinical risk score, and plain-English advisory |
| `GET` | `/api/compare-personas` | Evaluates all personas simultaneously under current location conditions |
| `POST` | `/api/advisory/generate` | Runs real-time "What-If" simulation with custom AQI / Temp overrides |
| `GET` | `/api/history?days=7` | Retrieves 7-day historical atmospheric snapshots and dispatched alert logs |
| `POST` | `/api/profile` | Updates user health conditions, sensitivity, and notification preferences |
| `POST` | `/api/scheduler/trigger` | Manually triggers the 15-minute background risk evaluator |
| `POST` | `/api/notifications/test-email` | Dispatches a verified test alert email via Gmail SMTP |
| `GET` | `/api/system-status` | Telemetry endpoint inspecting DB, LLM, SMTP, SMS, and OAuth health |

---

## 🧪 Automated System Verification

Verify 100% operational health across all endpoints, live feeds, clinical multiplier calculations, and notifications:

```powershell
python backend\test_api.py
```

Expected output:
```
=== RUNNING PERSONALIZED WEATHER-HEALTH SYSTEM VERIFICATION ===
PASS: GET / (HTML App) (Status: 200)
PASS: GET /openapi.json (Status: 200)
PASS: GET /auth/personas (Status: 200)
  -> Found 4 personas: ['Aditi Sharma', 'Rajiv Verma', 'Karan Malhotra', 'Aarav Patel']
PASS: POST /auth/demo-login (Asthma Worker) (Status: 200)
PASS: GET /api/dashboard (Status: 200)
  -> Location: Bhopal, Madhya Pradesh | Temp: 22.6°C | AQI: 61.0 (Moderate)
  -> Risk Multipliers: {'asthma_multiplier': 1.5, 'cardiac_multiplier': 1.0, ...}
PASS: GET /api/compare-personas (Status: 200)
  -> Evaluated all personas side-by-side
PASS: POST /api/scheduler/trigger (Status: 200)
PASS: POST /api/notifications/test-email (Status: 200)
  -> Email Dispatch Result: delivered (real SMTP) to tornovdutta@gmail.com
=== ALL SYSTEM VERIFICATION CHECKS COMPLETED SUCCESSFULLY ===
```

---

## 📄 License
MIT License. Built for hackathons and health-tech demonstrations.