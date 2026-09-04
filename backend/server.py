#!/usr/bin/env python3
"""
Personalized Weather-Health Advisory — Standalone Zero-Dependency Server.
Runs out-of-the-box on ANY Python version (including Python 3.14+) with ZERO external pip dependencies.
Implements the full REST API specification, deterministic risk multiplier engine,
Open-Meteo Weather & Air Quality integrations, interactive Swagger docs, and background scheduler.
"""

from datetime import datetime, timedelta, timezone
from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import logging
import os
import re
import smtplib
import socketserver
import sys
import threading
import time
import urllib.parse
import urllib.request
import uuid

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("server")

HOST = os.getenv("HOST", "127.0.0.1")
PORT = int(os.getenv("PORT", 8000))
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")

# -----------------------------------------------------------------------------
# In-Memory Database & Seed Personas
# -----------------------------------------------------------------------------
DEMO_PERSONAS = [
    {
        "user_id": "demo-asthma-worker",
        "email": "aditi.asthma@demo.org",
        "name": "Aditi Sharma",
        "picture": "https://api.dicebear.com/7.x/avataaars/svg?seed=Aditi",
        "profile": {
            "age_group": "18-40",
            "conditions": ["asthma"],
            "occupation": "outdoor_worker",
            "location": {
                "lat": 23.2547,
                "lon": 77.4029,
                "label": "Bhopal, Madhya Pradesh",
                "city": "Bhopal",
                "country": "India",
            },
            "notify_email": True,
            "notify_sms": True,
            "phone": "+919876543210",
            "alert_sensitivity": "high",
        },
    },
    {
        "user_id": "demo-senior-cardiac",
        "email": "rajiv.cardiac@demo.org",
        "name": "Rajiv Verma",
        "picture": "https://api.dicebear.com/7.x/avataaars/svg?seed=Rajiv",
        "profile": {
            "age_group": "60+",
            "conditions": ["heart_disease", "hypertension"],
            "occupation": "other",
            "location": {
                "lat": 28.6139,
                "lon": 77.2090,
                "label": "New Delhi, Delhi",
                "city": "New Delhi",
                "country": "India",
            },
            "notify_email": True,
            "notify_sms": False,
            "phone": "+919811122233",
            "alert_sensitivity": "high",
        },
    },
    {
        "user_id": "demo-office-healthy",
        "email": "karan.office@demo.org",
        "name": "Karan Malhotra",
        "picture": "https://api.dicebear.com/7.x/avataaars/svg?seed=Karan",
        "profile": {
            "age_group": "18-40",
            "conditions": ["none"],
            "occupation": "office",
            "location": {
                "lat": 19.0760,
                "lon": 72.8777,
                "label": "Mumbai, Maharashtra",
                "city": "Mumbai",
                "country": "India",
            },
            "notify_email": False,
            "notify_sms": False,
            "phone": "",
            "alert_sensitivity": "normal",
        },
    },
    {
        "user_id": "demo-pregnant-parent",
        "email": "ananya.pregnant@demo.org",
        "name": "Ananya Sen",
        "picture": "https://api.dicebear.com/7.x/avataaars/svg?seed=Ananya",
        "profile": {
            "age_group": "18-40",
            "conditions": ["pregnant", "allergies"],
            "occupation": "student",
            "location": {
                "lat": 12.9716,
                "lon": 77.5946,
                "label": "Bengaluru, Karnataka",
                "city": "Bengaluru",
                "country": "India",
            },
            "notify_email": True,
            "notify_sms": False,
            "phone": "+919833344455",
            "alert_sensitivity": "high",
        },
    },
]

USERS_DB = {}
PROFILES_DB = {}
SNAPSHOTS_DB = []
ALERTS_DB = []
AUDIT_NOTIFICATIONS = []

def init_seed_data():
    now = datetime.now(timezone.utc)
    for p in DEMO_PERSONAS:
        uid = p["user_id"]
        USERS_DB[uid] = {
            "id": uid,
            "email": p["email"],
            "name": p["name"],
            "picture": p["picture"],
            "is_demo": True,
            "created_at": (now - timedelta(days=14)).isoformat(),
        }
        prof = dict(p["profile"])
        prof["user_id"] = uid
        prof["updated_at"] = now.isoformat()
        PROFILES_DB[uid] = prof

        # Seed 7-day snapshots for trend charts
        base_aqi = 140 if "asthma" in prof["conditions"] else 110
        for i in range(7, 0, -1):
            day_time = now - timedelta(days=i, hours=3)
            var = ((i * 19) % 45) - 20
            aqi_v = max(45, base_aqi + var)
            snap = {
                "id": f"snap-{uid}-{i}",
                "user_id": uid,
                "timestamp": day_time.strftime("%a %d, %H:%M"),
                "day": day_time.strftime("%a"),
                "aqi": aqi_v,
                "pm2_5": round(aqi_v * 0.44, 1),
                "pm10": round(aqi_v * 0.73, 1),
                "temp_c": round(29.0 + (i % 3) * 1.4, 1),
                "humidity": 52 + (i * 2),
                "uv_index": round(5.8 + (i % 3), 1),
                "weather_code": 1 if i % 2 == 0 else 3,
                "location_label": prof["location"]["label"],
            }
            SNAPSHOTS_DB.append(snap)

        # Seed past alert
        alert_time = now - timedelta(days=2, hours=5)
        ALERTS_DB.insert(0, {
            "id": f"alert-{uid}-seed",
            "user_id": uid,
            "timestamp": alert_time.strftime("%b %d, %I:%M %p"),
            "risk_level": "high" if "asthma" in prof["conditions"] else "moderate",
            "headline": f"Environmental Sensitivity Advisory for {p['name']}",
            "advisory_text": f"Particulate concentration rose into moderate-high bands. Outdoor exertion during afternoon traffic spikes should be avoided. Keep inhalers or maintenance medicine readily on hand.",
            "explanation": [
                "AQI crossed personal sensitivity threshold (135)",
                "Elevated fine particulate matter (PM2.5: 62 µg/m³)",
            ],
            "action_items": [
                "Wear an N95 respirator during outdoor transit",
                "Keep windows closed during peak commute hours",
                "Ensure hydration with 2+ liters of water",
            ],
            "channel_sent": ["email"],
        })

init_seed_data()

# -----------------------------------------------------------------------------
# Weather & AQI Integration (Open-Meteo)
# -----------------------------------------------------------------------------
WMO_MAP = {
    0: ("Clear sky", "Sun", "good"),
    1: ("Mainly clear", "SunDim", "good"),
    2: ("Partly cloudy", "CloudSun", "good"),
    3: ("Overcast", "Cloud", "moderate"),
    45: ("Foggy", "CloudFog", "moderate"),
    51: ("Light drizzle", "CloudDrizzle", "moderate"),
    61: ("Slight rain", "CloudRain", "moderate"),
    63: ("Moderate rain", "CloudRain", "moderate"),
    65: ("Heavy rain", "CloudRainWind", "high"),
    80: ("Rain showers", "CloudRain", "moderate"),
    95: ("Thunderstorm", "CloudLightning", "severe"),
}

WEATHER_CACHE = {}
AQI_CACHE = {}

def fetch_weather(lat: float, lon: float):
    key = f"{lat:.2f},{lon:.2f}"
    now = time.time()
    if key in WEATHER_CACHE and now - WEATHER_CACHE[key]["time"] < 60:
        return WEATHER_CACHE[key]["data"]

    url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,relative_humidity_2m,weather_code,uv_index,wind_speed_10m&timezone=auto"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "WeatherHealthApp/1.0"})
        with urllib.request.urlopen(req, timeout=3.5) as resp:
            data = json.loads(resp.read().decode())
            cur = data.get("current", {})
            code = cur.get("weather_code", 0)
            label, icon, sev = WMO_MAP.get(code, ("Fair", "Sun", "good"))
            res = {
                "temperature": round(float(cur.get("temperature_2m", 27.5)), 1),
                "humidity": round(float(cur.get("relative_humidity_2m", 55.0)), 1),
                "uv_index": round(float(cur.get("uv_index", 5.5)), 1),
                "wind_speed": round(float(cur.get("wind_speed_10m", 8.5)), 1),
                "weather_code": code,
                "condition_label": label,
                "icon": icon,
                "severity": sev,
            }
            WEATHER_CACHE[key] = {"time": now, "data": res}
            return res
    except Exception as e:
        logger.warning(f"Weather API fallback ({e})")
        res = {
            "temperature": 28.5,
            "humidity": 58.0,
            "uv_index": 6.0,
            "wind_speed": 10.0,
            "weather_code": 2,
            "condition_label": "Partly cloudy",
            "icon": "CloudSun",
            "severity": "good",
        }
        return res

def fetch_aqi(lat: float, lon: float):
    key = f"{lat:.2f},{lon:.2f}"
    now = time.time()
    if key in AQI_CACHE and now - AQI_CACHE[key]["time"] < 60:
        return AQI_CACHE[key]["data"]

    url = f"https://air-quality-api.open-meteo.com/v1/air-quality?latitude={lat}&longitude={lon}&current=pm10,pm2_5,us_aqi,european_aqi&timezone=auto"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "WeatherHealthApp/1.0"})
        with urllib.request.urlopen(req, timeout=3.5) as resp:
            data = json.loads(resp.read().decode())
            cur = data.get("current", {})
            us_aqi = cur.get("us_aqi")
            pm2_5 = cur.get("pm2_5")
            pm10 = cur.get("pm10")
            eaqi = cur.get("european_aqi", 50)

            if us_aqi is None and pm2_5 is not None:
                us_aqi = min(500.0, max(0.0, pm2_5 * 2.1))
            elif us_aqi is None:
                us_aqi = 110.0

            if pm2_5 is None: pm2_5 = round(us_aqi * 0.45, 1)
            if pm10 is None: pm10 = round(us_aqi * 0.72, 1)

            val = round(float(us_aqi), 1)
            cat = get_aqi_category(val)
            res = {
                "aqi": val,
                "pm2_5": round(float(pm2_5), 1),
                "pm10": round(float(pm10), 1),
                "european_aqi": eaqi,
                "category": cat["level"],
                "color": cat["color"],
                "bg_color": cat["bgColor"],
                "description": cat["description"],
            }
            AQI_CACHE[key] = {"time": now, "data": res}
            return res
    except Exception as e:
        logger.warning(f"AQI API fallback ({e})")
        val = 125.0
        cat = get_aqi_category(val)
        return {
            "aqi": val,
            "pm2_5": 55.0,
            "pm10": 88.0,
            "european_aqi": 60,
            "category": cat["level"],
            "color": cat["color"],
            "bg_color": cat["bgColor"],
            "description": cat["description"],
        }

def get_aqi_category(aqi: float):
    if aqi <= 50:
        return {"level": "Good", "color": "#10B981", "bgColor": "rgba(16, 185, 129, 0.15)", "description": "Air quality is satisfactory with low health risk."}
    elif aqi <= 100:
        return {"level": "Moderate", "color": "#F59E0B", "bgColor": "rgba(245, 158, 11, 0.15)", "description": "Air quality is acceptable; mild sensitivity possible."}
    elif aqi <= 150:
        return {"level": "Unhealthy for Sensitive Groups", "color": "#F97316", "bgColor": "rgba(249, 115, 22, 0.15)", "description": "Sensitive individuals (asthma/cardiac) may experience symptoms."}
    elif aqi <= 200:
        return {"level": "Unhealthy", "color": "#EF4444", "bgColor": "rgba(239, 68, 68, 0.15)", "description": "Everyone may begin experiencing adverse health effects."}
    elif aqi <= 300:
        return {"level": "Very Unhealthy", "color": "#8B5CF6", "bgColor": "rgba(139, 92, 246, 0.15)", "description": "Health alert: Increased risk for the general public."}
    else:
        return {"level": "Hazardous", "color": "#881337", "bgColor": "rgba(136, 19, 55, 0.25)", "description": "Emergency conditions: Entire population at severe risk."}

# -----------------------------------------------------------------------------
# Deterministic Risk Multiplier Engine
# -----------------------------------------------------------------------------
def compute_risk(aqi: float, pm2_5: float, uv: float, temp: float, profile: dict):
    base = "low"
    base_factors = []

    if aqi > 300 or pm2_5 > 150:
        base = "severe"
        base_factors.append(f"Hazardous pollution levels (AQI {aqi}, PM2.5 {pm2_5} µg/m³)")
    elif aqi > 150 or pm2_5 > 75:
        base = "high"
        base_factors.append(f"Unhealthy pollution levels (AQI {aqi}, PM2.5 {pm2_5} µg/m³)")
    elif aqi > 100 or pm2_5 > 35:
        base = "moderate"
        base_factors.append(f"Moderate particulate pollution (AQI {aqi}, PM2.5 {pm2_5} µg/m³)")
    else:
        base_factors.append("Baseline air quality within acceptable limits")

    if uv >= 8.0:
        base_factors.append(f"Very High UV Index ({uv}) — rapid sunburn & ocular stress risk")
    elif uv >= 6.0:
        base_factors.append(f"High UV Index ({uv})")

    if temp >= 38.0:
        base_factors.append(f"Extreme heat stress ({temp}°C)")
    elif temp >= 34.0:
        base_factors.append(f"Elevated ambient temperature ({temp}°C)")

    conditions = [c.lower() for c in profile.get("conditions", [])]
    occupation = profile.get("occupation", "office").lower()
    age_group = profile.get("age_group", "18-40")
    sensitivity = profile.get("alert_sensitivity", "normal")

    escalation_reasons = []
    has_respiratory = any(c in conditions for c in ["asthma", "copd", "allergies"])
    has_cardiac = "heart_disease" in conditions or "hypertension" in conditions
    is_pregnant = "pregnant" in conditions
    is_outdoor = occupation in ["outdoor_worker", "athlete"]
    is_vulnerable_age = age_group in ["60+", "under-18"]

    if has_respiratory:
        escalation_reasons.append("Respiratory sensitivity (asthma/allergies) amplifies airway constriction from particulate matter.")
    if has_cardiac:
        escalation_reasons.append("Cardiovascular vulnerability increases vascular strain from fine PM2.5 exposure.")
    if is_pregnant:
        escalation_reasons.append("Pregnancy requires conservative pollution avoidance to minimize maternal-fetal oxidative stress.")
    if is_outdoor:
        escalation_reasons.append(f"Occupation ({occupation.replace('_', ' ')}) involves sustained ambient exposure and high tidal volume respiration.")
    if is_vulnerable_age:
        escalation_reasons.append(f"Age demographic ({age_group}) has heightened susceptibility to environmental shifts.")
    if sensitivity == "high":
        escalation_reasons.append("User configured high alert sensitivity preference for proactive warning.")

    escalate_count = sum([
        has_respiratory or has_cardiac or is_pregnant,
        is_outdoor,
        is_vulnerable_age,
        sensitivity == "high" and (aqi > 80 or uv > 5),
    ])

    levels = ["low", "moderate", "high", "severe"]
    base_idx = levels.index(base)
    extra_steps = 0
    if escalate_count >= 1: extra_steps += 1
    if escalate_count >= 3: extra_steps += 1

    final_idx = min(base_idx + extra_steps, len(levels) - 1)
    final_risk = levels[final_idx]

    score_map = {"low": 25, "moderate": 52, "high": 75, "severe": 94}
    numeric_score = min(100.0, score_map[final_risk] + (escalate_count * 2.5))

    color_meta = {
        "low": {"badge": "Low Risk", "color": "#10B981", "bgColor": "rgba(16, 185, 129, 0.15)"},
        "moderate": {"badge": "Moderate Risk", "color": "#F59E0B", "bgColor": "rgba(245, 158, 11, 0.15)"},
        "high": {"badge": "High Health Risk", "color": "#F97316", "bgColor": "rgba(249, 115, 22, 0.15)"},
        "severe": {"badge": "Severe Health Warning", "color": "#EF4444", "bgColor": "rgba(239, 68, 68, 0.2)"},
    }

    return {
        "risk_level": final_risk,
        "base_risk": base,
        "is_escalated": final_idx > base_idx,
        "escalation_count": escalate_count,
        "escalation_reasons": escalation_reasons,
        "base_factors": base_factors,
        "numeric_score": round(numeric_score, 1),
        "badge": color_meta[final_risk]["badge"],
        "color": color_meta[final_risk]["color"],
        "bg_color": color_meta[final_risk]["bgColor"],
    }

# -----------------------------------------------------------------------------
# LLM Advisory Generator with Grounded Heuristic Fallback
# -----------------------------------------------------------------------------
def generate_advisory(aqi: float, pm2_5: float, uv: float, temp: float, risk_info: dict, profile: dict):
    conditions = [c.lower() for c in profile.get("conditions", [])]
    occupation = profile.get("occupation", "office").lower()
    risk_level = risk_info.get("risk_level", "moderate")

    # If Groq key is present, try Groq
    if GROQ_API_KEY:
        try:
            prompt = (
                f"You are a public health assistant. Write a short (3-4 sentence), plain-English, "
                f"non-alarmist health advisory for this person: {profile.get('age_group')} age, occupation: {occupation}, "
                f"conditions: {conditions}. Conditions: AQI: {aqi}, PM2.5: {pm2_5} ug/m3, Temp: {temp}C, UV: {uv}. "
                f"Computed risk level: {risk_level}. Be concrete (mask type, time to avoid outdoors). "
                f"Respond with JSON: {{'headline': '...', 'advisory_text': '...', 'action_items': ['...', '...', '...']}}"
            )
            req = urllib.request.Request(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"},
                data=json.dumps({
                    "model": "llama-3.3-70b-versatile",
                    "messages": [{"role": "user", "content": prompt}],
                    "response_format": {"type": "json_object"},
                    "temperature": 0.3,
                }).encode(),
            )
            with urllib.request.urlopen(req, timeout=6) as r:
                res_data = json.loads(r.read().decode())
                parsed = json.loads(res_data["choices"][0]["message"]["content"])
                return {
                    "headline": parsed.get("headline", f"{risk_info['badge']} — Tailored Advisory"),
                    "advisory_text": parsed.get("advisory_text"),
                    "action_items": parsed.get("action_items", []),
                    "model_used": "Groq Llama 3.3 (Live LLM)",
                }
        except Exception as e:
            logger.warning(f"Groq API call error: {e}")

    # Clinically Grounded Heuristic Engine
    sentences = []
    actions = []
    has_asthma = "asthma" in conditions
    has_cardiac = "heart_disease" in conditions or "hypertension" in conditions
    is_outdoor = occupation in ["outdoor_worker", "athlete"]

    if risk_level == "severe":
        headline = "Critical Environmental Health Warning"
        if has_asthma:
            sentences.append("Severe particulate pollution poses an immediate threat to your bronchial airways today.")
            sentences.append("Reschedule non-essential outdoor errands and ensure your quick-relief inhaler is within arm's reach.")
            actions = [
                "Strictly wear a certified N95 or KN95 respirator outdoors",
                "Keep prescribed rescue inhaler accessible at all times",
                "Run indoor HEPA air purification on high mode",
            ]
        elif has_cardiac:
            sentences.append("Fine particulate levels are creating acute cardiovascular strain today.")
            sentences.append("Avoid heavy physical lifting or strenuous tasks outdoors, and remain in temperature-controlled spaces.")
            actions = [
                "Avoid sudden physical exertion or heavy lifting",
                "Stay in air-conditioned environments with recirculated air",
                "Monitor blood pressure and stay well-hydrated",
            ]
        else:
            sentences.append("Ambient air quality has entered hazardous territory for all individuals regardless of prior health.")
            sentences.append("Minimize outdoor travel, especially near congested roads, and use sealed masks if stepping outside.")
            actions = [
                "Equip an N95 respirator for any outdoor transit",
                "Keep windows and doors securely closed",
                "Move cardio or gym sessions entirely indoors",
            ]
    elif risk_level == "high":
        headline = "High Health Risk — Protective Precautions Advised"
        if is_outdoor:
            sentences.append(f"Given your outdoor occupation ({occupation.replace('_', ' ')}) and elevated particulates, continuous exposure will cause throat irritation.")
            sentences.append("Wear an N95 respirator during shifts and take periodic rests in filtered indoor areas.")
            actions = [
                "Wear an N95/FFP2 respirator throughout working shifts",
                "Take 10-minute rest breaks inside air-conditioned rooms",
                "Rinse eyes and nasal passages with saline after long stints",
            ]
        elif has_asthma:
            sentences.append("Airborne particulates are elevated to levels that trigger bronchial inflammation in sensitive airways.")
            sentences.append("Plan outdoor walking outside the 12 PM - 5 PM window and ensure indoor rooms have filtered air.")
            actions = [
                "Carry a maintenance inhaler when commuting",
                "Avoid high-traffic intersections during afternoon hours",
                "Maintain closed windows facing main avenues",
            ]
        else:
            sentences.append("Fine particulate matter is elevated, making extended outdoor cardio taxing on your lungs.")
            sentences.append("Consider replacing long outdoor runs with indoor training and keep living spaces ventilated with clean air.")
            actions = [
                "Switch outdoor workouts to indoor exercises",
                "Keep room air purifiers running",
                "Drink 2.5 to 3 liters of water across the day",
            ]
    elif risk_level == "moderate":
        headline = "Moderate Atmospheric Conditions — Mild Caution"
        sentences.append("Air quality is acceptable for the general population, though sensitive groups may notice slight irritation.")
        sentences.append("Routine outdoor commutes can proceed normally; sensitive individuals should pace intensive cardio.")
        actions = [
            "Normal daily errands and work routines are safe",
            "Sensitive individuals should keep basic medication handy",
            "Air out rooms during early morning hours",
        ]
    else:
        headline = "Optimal Environmental Conditions"
        sentences.append("Air quality and weather metrics are in an excellent range today, posing negligible environmental hazard.")
        sentences.append("It is a great day for outdoor exercise, walking, and natural indoor ventilation.")
        actions = [
            "Ideal weather for outdoor activities and sports",
            "Open windows for natural home ventilation",
            "No special protective gear or masks needed",
        ]

    if uv >= 7.0:
        sentences.append(f"UV Index is high ({uv}); apply broad-spectrum sunscreen if out between 11 AM and 3 PM.")
        actions.append(f"High UV ({uv}): Apply SPF 30+ sunscreen and wear sunglasses")

    return {
        "headline": headline,
        "advisory_text": " ".join(sentences),
        "action_items": actions[:4],
        "model_used": "Deterministic Clinical Heuristic (Demo-Safe)",
    }

# -----------------------------------------------------------------------------
# Background Scheduler Simulation
# -----------------------------------------------------------------------------
def evaluate_and_notify_user(uid: str):
    user = USERS_DB.get(uid)
    profile = PROFILES_DB.get(uid)
    if not user or not profile:
        return None

    loc = profile["location"]
    weather = fetch_weather(loc["lat"], loc["lon"])
    aqi_data = fetch_aqi(loc["lat"], loc["lon"])
    risk_info = compute_risk(aqi_data["aqi"], aqi_data["pm2_5"], weather["uv_index"], weather["temperature"], profile)

    # Always generate fresh advisory
    advisory = generate_advisory(aqi_data["aqi"], aqi_data["pm2_5"], weather["uv_index"], weather["temperature"], risk_info, profile)
    now = datetime.now(timezone.utc)

    alert_doc = {
        "id": f"alert-{uid}-{int(now.timestamp())}",
        "user_id": uid,
        "timestamp": now.strftime("%b %d, %I:%M %p"),
        "risk_level": risk_info["risk_level"],
        "headline": advisory["headline"],
        "advisory_text": advisory["advisory_text"],
        "explanation": risk_info["escalation_reasons"] or risk_info["base_factors"],
        "action_items": advisory["action_items"],
        "channel_sent": ["email" if profile.get("notify_email") else "in-app"],
    }
    ALERTS_DB.insert(0, alert_doc)

    # Dispatch email simulation
    AUDIT_NOTIFICATIONS.insert(0, {
        "channel": "email",
        "status": "delivered",
        "recipient": user["email"],
        "subject": f"Health Alert ({risk_info['risk_level'].upper()}): {loc['label']}",
        "preview": advisory["advisory_text"][:110] + "...",
        "time": now.strftime("%I:%M:%S %p"),
    })
    return alert_doc

def background_scheduler_worker():
    while True:
        time.sleep(900)  # 15 mins
        try:
            logger.info("Running background periodic health check...")
            for uid in list(USERS_DB.keys()):
                evaluate_and_notify_user(uid)
        except Exception as e:
            logger.error(f"Scheduler error: {e}")

sched_thread = threading.Thread(target=background_scheduler_worker, daemon=True)
sched_thread.start()

# -----------------------------------------------------------------------------
# HTTP Request Handler (REST API)
# -----------------------------------------------------------------------------
class HealthAdvisoryHandler(BaseHTTPRequestHandler):
    def _send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")

    def do_OPTIONS(self):
        self.send_response(204)
        self._send_cors_headers()
        self.end_headers()

    def _send_json(self, data, status_code=200):
        body = json.dumps(data).encode("utf-8")
        self.send_response(status_code)
        self._send_cors_headers()
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _read_body_json(self):
        try:
            length = int(self.headers.get("Content-Length", 0))
            if length > 0:
                return json.loads(self.rfile.read(length).decode("utf-8"))
        except Exception:
            pass
        return {}

    def _get_auth_user_id(self):
        auth_header = self.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            # Token format demo: "token-<uid>" or direct uid
            if token.startswith("token-"):
                return token.replace("token-", "")
            if token in USERS_DB:
                return token
        # Default to first demo persona if no token supplied
        return "demo-asthma-worker"

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        if path == "/" or path == "/app":
            accept_header = self.headers.get("Accept", "")
            # If explicit JSON requested, return API metadata
            if "application/json" in accept_header and path == "/":
                self._send_json({
                    "app": "Personalized Weather-Health Advisory API",
                    "status": "online",
                    "version": "1.0.0",
                    "docs_url": "/docs",
                    "ui_url": "/app",
                    "engine": "Standard High-Performance Pure Python Server (Zero Pip Dependencies)",
                })
                return
            
            # Serve the interactive single page application
            app_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend", "public", "app.html")
            if os.path.exists(app_path):
                with open(app_path, "rb") as f:
                    content = f.read()
                self.send_response(200)
                self._send_cors_headers()
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(content)))
                self.end_headers()
                self.wfile.write(content)
                return
            else:
                self._send_json({
                    "app": "Personalized Weather-Health Advisory API",
                    "status": "online",
                    "docs_url": "/docs",
                })
                return

        elif path == "/docs":
            # Embedded Interactive Swagger UI HTML
            html = """<!DOCTYPE html>
<html>
<head>
    <title>Personalized Weather-Health Advisory — API Docs</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
    <style>body { margin: 0; background: #0f172a; color: #fff; } .swagger-ui { filter: invert(88%) hue-rotate(180deg); }</style>
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
        window.ui = SwaggerUIBundle({
            url: '/openapi.json',
            dom_id: '#swagger-ui',
            deepLinking: true
        });
    </script>
</body>
</html>"""
            body = html.encode("utf-8")
            self.send_response(200)
            self._send_cors_headers()
            self.send_header("Content-Type", "text/html")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return

        elif path == "/openapi.json":
            self._send_json({
                "openapi": "3.0.0",
                "info": {"title": "Personalized Weather-Health Advisory API", "version": "1.0.0"},
                "paths": {
                    "/api/dashboard": {"get": {"summary": "Live Weather, AQI, Risk, and Personalized Advisory"}},
                    "/auth/personas": {"get": {"summary": "List available hackathon demo personas"}},
                    "/auth/demo-login": {"post": {"summary": "Instant demo login as chosen persona"}},
                    "/api/profile": {"post": {"summary": "Update user health profile"}},
                    "/api/history": {"get": {"summary": "Get 7-day snapshots and past alerts"}},
                    "/api/location": {"post": {"summary": "Update monitored location coordinates"}},
                    "/api/search-cities": {"get": {"summary": "Live city geocoding search"}},
                    "/api/advisory/generate": {"post": {"summary": "On-demand advisory generation with scenario simulations"}},
                    "/api/scheduler/trigger": {"post": {"summary": "Trigger automated alert evaluation immediately"}},
                },
            })
            return

        elif path == "/auth/personas":
            res = [
                {
                    "id": p["user_id"],
                    "name": p["name"],
                    "email": p["email"],
                    "picture": p["picture"],
                    "occupation": p["profile"]["occupation"],
                    "conditions": p["profile"]["conditions"],
                    "age_group": p["profile"]["age_group"],
                    "location": p["profile"]["location"]["label"],
                }
                for p in DEMO_PERSONAS
            ]
            self._send_json(res)
            return

        elif path == "/api/me":
            uid = self._get_auth_user_id()
            user = USERS_DB.get(uid, DEMO_PERSONAS[0])
            profile = PROFILES_DB.get(uid, DEMO_PERSONAS[0]["profile"])
            self._send_json({"user": user, "profile": profile})
            return

        elif path == "/api/dashboard":
            uid = self._get_auth_user_id()
            user = USERS_DB.get(uid, DEMO_PERSONAS[0])
            profile = PROFILES_DB.get(uid, DEMO_PERSONAS[0]["profile"])

            # Query param lat/lon overrides if present
            loc = profile.get("location", {})
            lat = float(query.get("lat", [loc.get("lat", 23.2547)])[0])
            lon = float(query.get("lon", [loc.get("lon", 77.4029)])[0])
            label = query.get("label", [loc.get("label", "Bhopal, MP")])[0]

            weather = fetch_weather(lat, lon)
            aqi_data = fetch_aqi(lat, lon)
            risk_info = compute_risk(aqi_data["aqi"], aqi_data["pm2_5"], weather["uv_index"], weather["temperature"], profile)
            advisory = generate_advisory(aqi_data["aqi"], aqi_data["pm2_5"], weather["uv_index"], weather["temperature"], risk_info, profile)

            # Record snapshot
            now = datetime.now(timezone.utc)
            snap = {
                "id": f"snap-{uid}-{int(now.timestamp())}",
                "user_id": uid,
                "timestamp": now.strftime("%a %d, %H:%M"),
                "day": now.strftime("%a"),
                "aqi": aqi_data["aqi"],
                "pm2_5": aqi_data["pm2_5"],
                "pm10": aqi_data["pm10"],
                "temp_c": weather["temperature"],
                "humidity": weather["humidity"],
                "uv_index": weather["uv_index"],
                "weather_code": weather["weather_code"],
                "location_label": label,
            }
            SNAPSHOTS_DB.append(snap)

            self._send_json({
                "location": {"lat": lat, "lon": lon, "label": label},
                "weather": weather,
                "aqi": aqi_data,
                "risk": risk_info,
                "advisory": advisory,
                "profile": profile,
                "user": {"name": user.get("name"), "email": user.get("email"), "picture": user.get("picture")},
                "updated_at": now.isoformat(),
            })
            return

        elif path == "/api/history":
            uid = self._get_auth_user_id()
            days = int(query.get("days", [7])[0])
            user_snaps = [s for s in SNAPSHOTS_DB if s.get("user_id") == uid]
            if len(user_snaps) < 4:
                user_snaps = SNAPSHOTS_DB[-12:]
            user_alerts = [a for a in ALERTS_DB if a.get("user_id") == uid]
            if not user_alerts:
                user_alerts = ALERTS_DB[:5]

            self._send_json({
                "days": days,
                "snapshots": user_snaps[-14:],
                "alerts": user_alerts[:15],
                "audit_notifications": AUDIT_NOTIFICATIONS[:10],
            })
            return

        elif path == "/api/search-cities":
            q = query.get("query", [""])[0]
            if not q:
                self._send_json([])
                return
            try:
                enc = urllib.parse.quote(q)
                url = f"https://geocoding-api.open-meteo.com/v1/search?name={enc}&count=5&language=en&format=json"
                req = urllib.request.Request(url, headers={"User-Agent": "WeatherHealthApp/1.0"})
                with urllib.request.urlopen(req, timeout=5) as r:
                    res = json.loads(r.read().decode()).get("results", [])
                    out = []
                    for item in res:
                        parts = [item.get("name"), item.get("admin1"), item.get("country")]
                        out.append({
                            "label": ", ".join([p for p in parts if p]),
                            "city": item.get("name"),
                            "country": item.get("country"),
                            "lat": item.get("latitude"),
                            "lon": item.get("longitude"),
                        })
                    self._send_json(out)
                    return
            except Exception as e:
                logger.warning(f"Geocoding fallback ({e})")

            presets = [
                {"label": "New Delhi, Delhi, India", "city": "New Delhi", "country": "India", "lat": 28.6139, "lon": 77.2090},
                {"label": "Bhopal, Madhya Pradesh, India", "city": "Bhopal", "country": "India", "lat": 23.2547, "lon": 77.4029},
                {"label": "Mumbai, Maharashtra, India", "city": "Mumbai", "country": "India", "lat": 19.0760, "lon": 72.8777},
                {"label": "Bengaluru, Karnataka, India", "city": "Bengaluru", "country": "India", "lat": 12.9716, "lon": 77.5946},
                {"label": "New York, NY, United States", "city": "New York", "country": "United States", "lat": 40.7128, "lon": -74.0060},
                {"label": "London, England, United Kingdom", "city": "London", "country": "United Kingdom", "lat": 51.5074, "lon": -0.1278},
            ]
            filtered = [p for p in presets if q.lower() in p["label"].lower()]
            self._send_json(filtered)
            return

        else:
            self._send_json({"detail": "Not Found"}, status_code=404)

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        body = self._read_body_json()

        if path == "/auth/demo-login":
            persona_id = body.get("persona_id", "demo-asthma-worker")
            persona = next((p for p in DEMO_PERSONAS if p["user_id"] == persona_id), DEMO_PERSONAS[0])
            uid = persona["user_id"]
            user = USERS_DB.get(uid)
            if not user:
                user = {
                    "id": uid,
                    "email": persona["email"],
                    "name": persona["name"],
                    "picture": persona["picture"],
                    "is_demo": True,
                }
                USERS_DB[uid] = user
                PROFILES_DB[uid] = persona["profile"]

            profile = PROFILES_DB[uid]
            token = f"token-{uid}"
            self._send_json({
                "access_token": token,
                "token_type": "bearer",
                "user": user,
                "profile": profile,
            })
            return

        elif path == "/api/profile":
            uid = self._get_auth_user_id()
            profile = PROFILES_DB.get(uid, {})
            profile.update({
                "age_group": body.get("age_group", profile.get("age_group", "18-40")),
                "conditions": body.get("conditions", profile.get("conditions", ["none"])),
                "occupation": body.get("occupation", profile.get("occupation", "office")),
                "alert_sensitivity": body.get("alert_sensitivity", profile.get("alert_sensitivity", "normal")),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            })
            if "location" in body and body["location"]:
                profile["location"] = body["location"]
            if "notify_email" in body:
                profile["notify_email"] = body["notify_email"]
            if "notify_sms" in body:
                profile["notify_sms"] = body["notify_sms"]
            if "phone" in body:
                profile["phone"] = body["phone"]

            PROFILES_DB[uid] = profile
            self._send_json({"status": "success", "profile": profile})
            return

        elif path == "/api/location":
            uid = self._get_auth_user_id()
            profile = PROFILES_DB.get(uid, {})
            profile["location"] = {
                "lat": body.get("lat", 23.2547),
                "lon": body.get("lon", 77.4029),
                "label": body.get("label", "Bhopal, MP"),
                "city": body.get("city", "Bhopal"),
                "country": body.get("country", "India"),
            }
            PROFILES_DB[uid] = profile
            self._send_json({"status": "success", "location": profile["location"]})
            return

        elif path == "/api/advisory/generate":
            uid = self._get_auth_user_id()
            profile = PROFILES_DB.get(uid, DEMO_PERSONAS[0]["profile"])
            loc = profile.get("location", {})
            lat = loc.get("lat", 23.2547)
            lon = loc.get("lon", 77.4029)

            weather = fetch_weather(lat, lon)
            aqi_data = fetch_aqi(lat, lon)

            sim_aqi = body.get("simulate_aqi")
            actual_aqi = sim_aqi if sim_aqi is not None else aqi_data["aqi"]
            actual_pm25 = round(actual_aqi * 0.45, 1) if sim_aqi is not None else aqi_data["pm2_5"]
            actual_temp = body.get("simulate_temp", weather["temperature"])
            actual_uv = body.get("simulate_uv", weather["uv_index"])

            risk_info = compute_risk(actual_aqi, actual_pm25, actual_uv, actual_temp, profile)
            advisory = generate_advisory(actual_aqi, actual_pm25, actual_uv, actual_temp, risk_info, profile)

            now = datetime.now(timezone.utc)
            alert_doc = {
                "id": f"alert-{uid}-{int(now.timestamp())}",
                "user_id": uid,
                "timestamp": now.strftime("%b %d, %I:%M %p"),
                "risk_level": risk_info["risk_level"],
                "headline": advisory["headline"],
                "advisory_text": advisory["advisory_text"],
                "explanation": risk_info["escalation_reasons"] or risk_info["base_factors"],
                "action_items": advisory["action_items"],
                "channel_sent": ["in-app"],
            }
            ALERTS_DB.insert(0, alert_doc)
            self._send_json({
                "risk": risk_info,
                "advisory": advisory,
                "simulated": sim_aqi is not None,
                "recorded_alert_id": alert_doc["id"],
            })
            return

        elif path == "/api/scheduler/trigger":
            uid = self._get_auth_user_id()
            alert_doc = evaluate_and_notify_user(uid)
            self._send_json({
                "status": "success",
                "triggered_alert": alert_doc is not None,
                "alert_details": alert_doc,
                "recent_audit_log": AUDIT_NOTIFICATIONS[:5],
            })
            return

        else:
            self._send_json({"detail": "Not Found"}, status_code=404)

    def do_PUT(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        body = self._read_body_json()

        if path == "/api/notifications":
            uid = self._get_auth_user_id()
            profile = PROFILES_DB.get(uid, {})
            profile["notify_email"] = body.get("notify_email", profile.get("notify_email", True))
            profile["notify_sms"] = body.get("notify_sms", profile.get("notify_sms", False))
            profile["phone"] = body.get("phone", profile.get("phone", ""))
            profile["alert_sensitivity"] = body.get("alert_sensitivity", profile.get("alert_sensitivity", "normal"))
            PROFILES_DB[uid] = profile
            self._send_json({"status": "success", "notifications": profile})
            return
        else:
            self._send_json({"detail": "Not Found"}, status_code=404)


class ThreadedHTTPServer(socketserver.ThreadingMixIn, HTTPServer):
    daemon_threads = True


def run_server():
    server_address = (HOST, PORT)
    httpd = ThreadedHTTPServer(server_address, HealthAdvisoryHandler)
    logger.info(f"Health Advisory Backend Server running on http://{HOST}:{PORT}")
    logger.info(f"Interactive Swagger Documentation available at http://{HOST}:{PORT}/docs")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        logger.info("Server shutting down...")
        httpd.server_close()


if __name__ == "__main__":
    run_server()
