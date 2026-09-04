# AeroHealth — Personalized Weather-Health Advisory System

> **One-liner:** Generic AQI and weather alerts treat everyone the same. **AeroHealth** pulls real-time live weather and air quality for a user's location, combines it with an individual health profile (age group, conditions, occupation, sensitivity), applies a deterministic clinical risk multiplier, and uses an LLM to generate plain-English, personalized advisories with actionable medical steps — plus a 7-day retrospective trend view.

---

## 🌟 Key Highlights & Hackathon Differentiators

1. **Two-Tier Personalization Architecture (Deterministic Safety Net + Generative Communication)**:
   - **Tier 1 (Explainable Risk Multiplier)**: Fast, deterministic rule-based calculation evaluating AQI, PM2.5, UV Index, heat stress, respiratory/cardiac conditions, age vulnerability, and occupational exposure. Eliminates AI hallucination risks and provides clear clinical rationale.
   - **Tier 2 (Empathetic Plain-English Advisory)**: Generative AI (Groq Llama 3.3 / Google Gemini) turns numbers into a 3-4 sentence actionable narrative tailored to the specific individual (e.g. mask grade, peak hour avoidance, hydration, inhaler readiness).
2. **Zero External API Key Dependency for Core Demo**:
   - Primary weather and air quality endpoints utilize **Open-Meteo** (no keys, no rate-limit headaches).
   - High-fidelity clinical heuristic fallback guarantees the system never fails or crashes even if external LLM quotas run out.
3. **Interactive Hackathon Demo Switcher**:
   - Instant 1-click persona switching (Asthmatic Outdoor Worker, Senior with Heart Condition, Healthy Desk Worker, Pregnant Student) showing how the exact same air quality dynamically shifts risk level and actionable advice.
4. **"What-If" Scenario Simulator**:
   - Live sliders allowing judges to stress-test the system: simulate severe AQI spikes or heatwaves in real-time.
5. **7-Day Trajectory & Retrospective Trend Charts**:
   - Interactive SVG charting of AQI vs. PM2.5 with safety thresholds and historical advisory audit logs.
6. **Automated Notification Pipeline (APScheduler)**:
   - Background periodic worker checks conditions and triggers email/SMS alerts if risk thresholds are crossed, with on-demand simulation triggers.

---

## 🏗️ System Architecture

```
┌────────────────────────────────────────────────────────┐
│             AeroHealth Single Page Web App             │
│  - Atmospheric Feed Card      - Visual AQI Arc Gauge   │
│  - AI Advisory & Action List  - 7-Day Trend Chart      │
│  - Hackathon Persona Bar      - What-If Stress-Tester  │
│  - Live City Search & GPS     - Notification Bell Log  │
└───────────────────────────▲────────────────────────────┘
                            │ REST / JSON
┌───────────────────────────▼────────────────────────────┐
│                    Backend Server                      │
│  ├── Auth & Demo Personas (/auth/personas, /demo-login)│
│  ├── Health Profile Management (/api/profile, /api/me) │
│  ├── Live Dashboard Engine (/api/dashboard)            │
│  ├── On-Demand Advisory & Simulator (/advisory/generate)│
│  ├── 7-Day Retrospective Logs (/api/history)           │
│  └── APScheduler Background Worker (/scheduler/trigger)│
└─────────────┬──────────────────────────┬───────────────┘
              │                          │
   ┌──────────▼──────────┐    ┌──────────▼──────────────┐
   │ Deterministic Risk  │    │   External Integrations │
   │  Multiplier Engine  │    │  - Open-Meteo Weather   │
   │ (Clinical Safety)   │    │  - Open-Meteo AQI       │
   └──────────┬──────────┘    │  - Open-Meteo Geocoding │
              │               │  - Groq Llama 3.3 /     │
   ┌──────────▼──────────┐    │    Gemini 1.5 Flash     │
   │  Plain-English LLM  │    │  - SMTP Email & SMS Log │
   │   Advisory Layer    │    │  - MongoDB Atlas Store  │
   └─────────────────────┘    └─────────────────────────┘
```

---

## 📊 Deterministic Risk Engine Logic

```python
def compute_risk_assessment(aqi, pm2_5, uv, temp, profile):
    # Tier 1: Base Environmental Risk
    base = "low"
    if aqi > 300 or pm2_5 > 150: base = "severe"
    elif aqi > 150: base = "high"
    elif aqi > 100: base = "moderate"

    # Tier 2: Individual Health Escalation Multiplier
    has_respiratory = "asthma" in profile["conditions"]
    has_cardiac = "heart_disease" in profile["conditions"]
    is_outdoor = profile["occupation"] == "outdoor_worker"
    is_vulnerable_age = profile["age_group"] in ["60+", "under-18"]

    escalate_count = sum([has_respiratory or has_cardiac, is_outdoor, is_vulnerable_age])
    levels = ["low", "moderate", "high", "severe"]
    # Step up risk category based on compounding vulnerabilities
    idx = min(levels.index(base) + (1 if escalate_count >= 1 else 0) + (1 if escalate_count >= 3 else 0), 3)
    return levels[idx]
```

---

## 🚀 Quickstart & Demo Guide

### Option 1: Instant 1-Click Launch (Recommended)
Simply run the startup script in PowerShell or Command Prompt:

```powershell
.\run_dev.ps1
```
or double click `run_dev.bat`.

This immediately starts the backend server on `http://127.0.0.1:8000/` and opens the interactive web application in your browser!

### Option 2: Running via Python
```bash
py backend/server.py
```
- **Web App**: Open [http://127.0.0.1:8000/](http://127.0.0.1:8000/) or [http://127.0.0.1:8000/app](http://127.0.0.1:8000/app)
- **Interactive Swagger Documentation**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

### Option 3: Full FastAPI Stack (Python <= 3.13)
```bash
uvicorn app.main:app --app-dir backend --reload --port 8000
```

---

## 🔌 API Endpoints Summary

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` or `/app` | Interactive Single-Page Web Application |
| `GET` | `/docs` | Interactive Swagger UI API documentation |
| `GET` | `/openapi.json` | OpenAPI 3.0 schema |
| `GET` | `/auth/personas` | List pre-configured demo health personas |
| `POST` | `/auth/demo-login` | Instant authentication as selected persona |
| `GET` | `/api/dashboard` | Aggregated live weather, AQI, risk rating & LLM advisory |
| `POST` | `/api/profile` | Update personal conditions, occupation & sensitivity |
| `POST` | `/api/location` | Update user coordinates & monitored city |
| `GET` | `/api/search-cities` | Real-time global city search (Open-Meteo Geocoding) |
| `POST` | `/api/advisory/generate` | Force recalculation / test "What-If" scenario simulation |
| `GET` | `/api/history` | Retrieve 7-day environmental snapshots & past alert records |
| `POST` | `/api/scheduler/trigger` | Manually fire background APScheduler evaluation |

---

## 🏆 Presentation Demo Script for Judges

1. **The Hook (15s)**: Show standard weather app AQI (e.g. 110 "Moderate"). Explain: *"To an office worker, 110 is harmless. To Aditi, an asthmatic traffic officer, 110 causes acute airway restriction. Generic apps fail her."*
2. **The Demo Persona Switcher (30s)**: Click between **Aditi Sharma (Asthma)** and **Karan Malhotra (Healthy)**. Point out how the Risk Level dynamically jumps from *Moderate* to *Severe/High*, and the plain-English advisory rewrites itself from general advice to prescribing an N95 mask and carrying an inhaler.
3. **What-If Scenario Stress Test (20s)**: Click **⚡ Test "What-If" Scenario**, drag the AQI slider to 280, and hit *Run Scenario*. Watch the advisory instantly adapt into an emergency protocol.
4. **The Audit & Background Alerts (15s)**: Open the notification drawer on the right and click **Simulate Background Poll** to demonstrate the automated APScheduler alerting pipeline in action.