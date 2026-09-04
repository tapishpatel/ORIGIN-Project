#!/usr/bin/env python3
"""
Personalized Weather-Health Advisory — Production-Grade Server.
Implements:
- Full REST API specification
- Real Environment Details Wiring (.env / env)
- MongoDB Atlas (PyMongo) with robust In-Memory fallback
- Hugging Face Inference Router (Qwen 2.5 72B) with ThreadPool parallelization & Circuit Breaker
- Real Gmail SMTP TLS delivery for health alerts
- Fast2SMS API integration for SMS alerts
- Google OAuth 2.0 consent and callback flow
- Open-Meteo Weather & Air Quality integrations with Authenticity & Freshness metadata
- Interactive Swagger docs and background health check scheduler
"""

from datetime import datetime, timedelta, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from http.server import HTTPServer, BaseHTTPRequestHandler
import concurrent.futures
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

# -----------------------------------------------------------------------------
# 1. Environment Configuration Loader
# -----------------------------------------------------------------------------
def load_env_file():
    candidates = [
        os.path.join(os.path.dirname(__file__), "env"),
        os.path.join(os.path.dirname(__file__), ".env"),
        os.path.join(os.path.dirname(os.path.dirname(__file__)), "backend", "env"),
        os.path.join(os.path.dirname(os.path.dirname(__file__)), "backend", ".env"),
        os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"),
    ]
    for path in candidates:
        if os.path.isfile(path):
            try:
                with open(path, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith("#") and "=" in line:
                            k, v = line.split("=", 1)
                            k = k.strip()
                            v = v.strip().strip("'\"")
                            if k:
                                os.environ[k] = v
                logger.info(f"Loaded environment variables from: {path}")
            except Exception as err:
                logger.warning(f"Could not load env from {path}: {err}")

load_env_file()

HOST = os.getenv("HOST", "127.0.0.1")
PORT = int(os.getenv("PORT", 8000))
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-key-weather-health-advisory-2026")

# Google OAuth 2.0
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/auth/google/callback")

# LLM Providers
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
HF_TOKEN = os.getenv("HF_TOKEN", "")
HF_MODEL = os.getenv("HF_MODEL", "Qwen/Qwen2.5-72B-Instruct")

# Email Notifications (Gmail SMTP)
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")

# SMS Notifications
SMS_PROVIDER = os.getenv("SMS_PROVIDER", "mock")
FAST2SMS_API_KEY = os.getenv("FAST2SMS_API_KEY", "")

# Scheduler
SCHEDULER_INTERVAL_MINUTES = int(os.getenv("SCHEDULER_INTERVAL_MINUTES", 15))

# Active LLM Mode identification
ACTIVE_LLM_MODE = "Heuristic fallback (no LLM)"
if HF_TOKEN and HF_TOKEN.strip():
    ACTIVE_LLM_MODE = f"AI-generated ({HF_MODEL.split('/')[-1].replace('-Instruct', '')})"
elif GROQ_API_KEY and GROQ_API_KEY.strip():
    ACTIVE_LLM_MODE = "AI-generated (Groq)"
elif GEMINI_API_KEY and GEMINI_API_KEY.strip():
    ACTIVE_LLM_MODE = "AI-generated (Gemini)"

logger.info(f"=== [STARTUP] LLM ENGINE ACTIVE: {ACTIVE_LLM_MODE} ===")
if SMTP_USER:
    logger.info(f"=== [STARTUP] SMTP Configured for: {SMTP_USER} via {SMTP_HOST}:{SMTP_PORT} ===")
if FAST2SMS_API_KEY:
    logger.info(f"=== [STARTUP] Fast2SMS Configured (Provider mode: {SMS_PROVIDER}) ===")
if GOOGLE_CLIENT_ID:
    logger.info(f"=== [STARTUP] Google OAuth 2.0 Configured with Client ID: {GOOGLE_CLIENT_ID[:16]}... ===")

# -----------------------------------------------------------------------------
# 2. Database Layer: MongoDB Atlas (PyMongo) with In-Memory Resilience
# -----------------------------------------------------------------------------
MONGO_URI = os.getenv("MONGO_URI", "")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "weather_health_db")

mongo_client = None
mongo_db = None
mongo_connected = False

if MONGO_URI and MONGO_URI.strip():
    try:
        import pymongo
        mongo_client = pymongo.MongoClient(MONGO_URI, serverSelectionTimeoutMS=4000)
        mongo_client.server_info()
        mongo_db = mongo_client[MONGO_DB_NAME]
        mongo_connected = True
        logger.info(f"=== [STARTUP] DATABASE: Connected to MongoDB Atlas ({MONGO_DB_NAME}) ===")
    except Exception as me:
        logger.warning(f"MongoDB Atlas connection failed ({me}). Operating in resilient In-Memory mode.")
        mongo_connected = False
else:
    logger.info("=== [STARTUP] DATABASE: Using In-Memory Store ===")

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
            "phone": "+919822233344",
            "alert_sensitivity": "normal",
        },
    },
    {
        "user_id": "demo-child-asthma",
        "email": "aarav.child@demo.org",
        "name": "Aarav Patel (Parent Account)",
        "picture": "https://api.dicebear.com/7.x/avataaars/svg?seed=Aarav",
        "profile": {
            "age_group": "under_18",
            "conditions": ["asthma", "allergies"],
            "occupation": "student",
            "location": {
                "lat": 12.9716,
                "lon": 77.5946,
                "label": "Bengaluru, Karnataka",
                "city": "Bengaluru",
                "country": "India",
            },
            "notify_email": True,
            "notify_sms": True,
            "phone": "+919833344455",
            "alert_sensitivity": "high",
        },
    },
]

USERS_DB = {}
PROFILES_DB = {}
ALERTS_DB = []
SNAPSHOTS_DB = []
AUDIT_NOTIFICATIONS = []

for p in DEMO_PERSONAS:
    uid = p["user_id"]
    u_data = {
        "id": uid,
        "email": p["email"],
        "name": p["name"],
        "picture": p["picture"],
        "is_demo": True,
        "auth_provider": "demo",
    }
    USERS_DB[uid] = u_data
    PROFILES_DB[uid] = dict(p["profile"])

# Seed demo personas to MongoDB Atlas if connected
if mongo_connected:
    try:
        for p in DEMO_PERSONAS:
            mongo_db.users.update_one(
                {"id": p["user_id"]},
                {"$setOnInsert": USERS_DB[p["user_id"]]},
                upsert=True,
            )
            mongo_db.profiles.update_one(
                {"user_id": p["user_id"]},
                {"$setOnInsert": PROFILES_DB[p["user_id"]]},
                upsert=True,
            )
        logger.info("Synchronized seed personas with MongoDB Atlas.")
    except Exception as e:
        logger.warning(f"Error seeding MongoDB personas: {e}")

# Pre-populate historical snapshots
_now = datetime.now(timezone.utc)
_days_abbr = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
for i in range(7, 0, -1):
    dt = _now - timedelta(days=i)
    day_name = _days_abbr[dt.weekday()]
    base_aqi = 65 + (i * 14) % 110
    SNAPSHOTS_DB.append({
        "id": f"seed-snap-{i}",
        "user_id": "demo-asthma-worker",
        "timestamp": dt.strftime("%b %d, %I:%M %p"),
        "day": day_name,
        "aqi": base_aqi,
        "pm2_5": round(base_aqi * 0.46, 1),
        "pm10": round(base_aqi * 0.88, 1),
        "temp_c": round(28.0 + (i % 5), 1),
        "humidity": 55 + (i % 20),
        "uv_index": 5.5,
        "weather_code": 1 if i % 2 == 0 else 3,
        "location_label": "Bhopal, MP",
    })

ALERTS_DB.append({
    "id": "alert-seed-1",
    "user_id": "demo-asthma-worker",
    "timestamp": (_now - timedelta(hours=3)).strftime("%b %d, %I:%M %p"),
    "risk_level": "high",
    "headline": "Elevated PM2.5 Warning for Outdoor Work",
    "advisory_text": "Airborne particulates in Bhopal have surged past safe levels for individuals with asthma. Plan shifts outside peak smog hours and wear an N95 respirator.",
    "explanation": ["Asthma Multiplier (1.50x)", "Outdoor Worker Exposure (1.25x)"],
    "action_items": [
        "Equip N95 respirator during outdoor shifts",
        "Keep inhaler within arm's reach",
        "Drink 2.5L water to ease respiratory tract",
    ],
    "channel_sent": ["email", "sms"],
})

# Storage helper functions
def db_save_user(user: dict):
    USERS_DB[user["id"]] = user
    if mongo_connected:
        try:
            mongo_db.users.update_one({"id": user["id"]}, {"$set": user}, upsert=True)
        except Exception as e:
            logger.warning(f"Mongo save user error: {e}")

def db_get_user(uid: str):
    if mongo_connected:
        try:
            doc = mongo_db.users.find_one({"id": uid}, {"_id": 0})
            if doc:
                return doc
        except Exception as e:
            logger.warning(f"Mongo get user error: {e}")
    return USERS_DB.get(uid)

def db_save_profile(uid: str, profile: dict):
    PROFILES_DB[uid] = profile
    if mongo_connected:
        try:
            mongo_db.profiles.update_one({"user_id": uid}, {"$set": profile}, upsert=True)
        except Exception as e:
            logger.warning(f"Mongo save profile error: {e}")

def db_get_profile(uid: str):
    if mongo_connected:
        try:
            doc = mongo_db.profiles.find_one({"user_id": uid}, {"_id": 0})
            if doc:
                return doc
        except Exception as e:
            logger.warning(f"Mongo get profile error: {e}")
    return PROFILES_DB.get(uid)

def db_save_alert(alert: dict):
    ALERTS_DB.insert(0, alert)
    if mongo_connected:
        try:
            mongo_db.alerts.insert_one(dict(alert))
        except Exception as e:
            logger.warning(f"Mongo save alert error: {e}")

def db_get_alerts(uid: str, limit: int = 15):
    if mongo_connected:
        try:
            docs = list(mongo_db.alerts.find({"user_id": uid}, {"_id": 0}).sort("timestamp", -1).limit(limit))
            if docs:
                return docs
        except Exception as e:
            logger.warning(f"Mongo get alerts error: {e}")
    user_alerts = [a for a in ALERTS_DB if a.get("user_id") == uid]
    return user_alerts[:limit] if user_alerts else ALERTS_DB[:limit]

def db_save_snapshot(snap: dict):
    SNAPSHOTS_DB.append(snap)
    if mongo_connected:
        try:
            mongo_db.snapshots.insert_one(dict(snap))
        except Exception as e:
            logger.warning(f"Mongo save snapshot error: {e}")

def db_get_snapshots(uid: str, limit: int = 14):
    if mongo_connected:
        try:
            docs = list(mongo_db.snapshots.find({"user_id": uid}, {"_id": 0}).sort("timestamp", -1).limit(limit))
            if docs:
                return list(reversed(docs))
        except Exception as e:
            logger.warning(f"Mongo get snapshots error: {e}")
    user_snaps = [s for s in SNAPSHOTS_DB if s.get("user_id") == uid]
    return user_snaps[-limit:] if len(user_snaps) >= 4 else SNAPSHOTS_DB[-limit:]

# -----------------------------------------------------------------------------
# 3. Notification Dispatch Engine (Gmail SMTP + Fast2SMS)
# -----------------------------------------------------------------------------
def send_email_notification(to_email: str, subject: str, headline: str, advisory_text: str, risk_level: str, action_items: list, location_label: str):
    """Sends a real email using Gmail SMTP TLS if credentials are configured."""
    now_str = datetime.now(timezone.utc).strftime("%I:%M:%S %p")
    if not SMTP_USER or not SMTP_PASSWORD:
        entry = {
            "channel": "email",
            "status": "simulated (no SMTP credentials)",
            "recipient": to_email,
            "subject": subject,
            "preview": advisory_text[:110] + "...",
            "time": now_str,
        }
        AUDIT_NOTIFICATIONS.insert(0, entry)
        return entry

    # Forward demo accounts to the configured developer/user email
    actual_recipient = SMTP_USER if ("@demo.org" in to_email or to_email == SMTP_USER) else to_email

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"AeroHealth Advisory <{SMTP_USER}>"
        msg["To"] = actual_recipient

        actions_html = "".join([f"<li style='margin-bottom:6px; color:#e2e8f0;'>{act}</li>" for act in action_items])
        risk_color = "#ef4444" if risk_level in ["severe", "high"] else "#f59e0b" if risk_level == "moderate" else "#10b981"
        
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0b0f19; margin: 0; padding: 24px; color: #f8fafc;">
            <div style="max-width: 620px; margin: 0 auto; background: #111827; border: 1px solid #1f2937; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
                <div style="background: linear-gradient(135deg, #0284c7 0%, #38bdf8 100%); padding: 24px; text-align: left;">
                    <h1 style="margin: 0; font-size: 22px; color: #ffffff; letter-spacing: -0.5px;">🌿 AeroHealth Alert</h1>
                    <p style="margin: 4px 0 0 0; font-size: 13px; color: #e0f2fe;">Personalized Environmental Health Advisory</p>
                </div>
                <div style="padding: 24px;">
                    <div style="margin-bottom: 20px;">
                        <span style="display: inline-block; background: {risk_color}; color: #ffffff; font-size: 11px; font-weight: 700; text-transform: uppercase; padding: 4px 10px; border-radius: 9999px; letter-spacing: 0.5px;">
                            Risk Level: {risk_level.upper()}
                        </span>
                        <h2 style="font-size: 20px; color: #f8fafc; margin: 12px 0 8px 0; line-height: 1.3;">{headline}</h2>
                        <p style="font-size: 15px; color: #cbd5e1; line-height: 1.6; margin: 0;">{advisory_text}</p>
                    </div>
                    <div style="background: #1f2937; border-radius: 12px; padding: 18px; margin-bottom: 20px; border: 1px solid #374151;">
                        <h3 style="margin: 0 0 10px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; color: #94a3b8;">Recommended Actions</h3>
                        <ul style="margin: 0; padding-left: 20px; font-size: 14px;">
                            {actions_html}
                        </ul>
                    </div>
                    <div style="border-top: 1px solid #1f2937; padding-top: 16px; font-size: 12px; color: #64748b;">
                        <p style="margin: 2px 0;">📍 Location: <strong>{location_label}</strong></p>
                        <p style="margin: 2px 0;">🤖 Intelligence Engine: <strong>{ACTIVE_LLM_MODE}</strong></p>
                        <p style="margin: 2px 0;">🎯 Recipient Target: {to_email} (Forwarded to {actual_recipient})</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
        plain_body = f"AeroHealth Alert: {risk_level.upper()}\n\n{headline}\n\n{advisory_text}\n\nActions:\n" + "\n".join([f"- {a}" for a in action_items]) + f"\n\nLocation: {location_label}"
        
        msg.attach(MIMEText(plain_body, "plain"))
        msg.attach(MIMEText(html_body, "html"))

        server = smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10)
        server.starttls()
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()

        entry = {
            "channel": "email",
            "status": "delivered (real SMTP)",
            "recipient": actual_recipient,
            "subject": subject,
            "preview": advisory_text[:110] + "...",
            "time": now_str,
        }
        AUDIT_NOTIFICATIONS.insert(0, entry)
        logger.info(f"Delivered real alert email via Gmail SMTP to: {actual_recipient}")
        return entry
    except Exception as e:
        logger.warning(f"SMTP dispatch encountered error: {e}")
        entry = {
            "channel": "email",
            "status": f"failed ({str(e)[:40]})",
            "recipient": actual_recipient,
            "subject": subject,
            "preview": advisory_text[:110] + "...",
            "time": now_str,
        }
        AUDIT_NOTIFICATIONS.insert(0, entry)
        return entry

def send_sms_notification(phone_number: str, message_text: str):
    """Sends SMS using Fast2SMS API if key and phone number are present."""
    now_str = datetime.now(timezone.utc).strftime("%I:%M:%S %p")
    clean_phone = re.sub(r"[^0-9]", "", phone_number or "")
    if clean_phone.startswith("91") and len(clean_phone) == 12:
        clean_phone = clean_phone[2:]

    if not FAST2SMS_API_KEY or len(clean_phone) != 10:
        entry = {
            "channel": "sms",
            "status": "simulated (Fast2SMS key or valid 10-digit number missing)",
            "recipient": phone_number or "N/A",
            "preview": message_text[:100] + "...",
            "time": now_str,
        }
        AUDIT_NOTIFICATIONS.insert(0, entry)
        return entry

    if SMS_PROVIDER.lower() == "mock":
        entry = {
            "channel": "sms",
            "status": "simulated (SMS_PROVIDER=mock)",
            "recipient": clean_phone,
            "preview": message_text[:100] + "...",
            "time": now_str,
        }
        AUDIT_NOTIFICATIONS.insert(0, entry)
        return entry

    try:
        sms_url = "https://www.fast2sms.com/dev/bulkV2"
        data = urllib.parse.urlencode({
            "authorization": FAST2SMS_API_KEY,
            "route": "q",
            "message": message_text[:150],
            "language": "english",
            "numbers": clean_phone,
        }).encode("utf-8")
        req = urllib.request.Request(sms_url, data=data, headers={"Content-Type": "application/x-www-form-urlencoded"})
        with urllib.request.urlopen(req, timeout=6) as resp:
            res_json = json.loads(resp.read().decode())
            status = "delivered (Fast2SMS)" if res_json.get("return") else "failed (Fast2SMS rejected)"
            entry = {
                "channel": "sms",
                "status": status,
                "recipient": clean_phone,
                "preview": message_text[:100] + "...",
                "time": now_str,
                "api_response": res_json,
            }
            AUDIT_NOTIFICATIONS.insert(0, entry)
            return entry
    except Exception as e:
        logger.warning(f"Fast2SMS API call error: {e}")
        entry = {
            "channel": "sms",
            "status": f"failed ({str(e)[:40]})",
            "recipient": clean_phone,
            "preview": message_text[:100] + "...",
            "time": now_str,
        }
        AUDIT_NOTIFICATIONS.insert(0, entry)
        return entry

# -----------------------------------------------------------------------------
# 4. Weather & Air Quality Data Layer (With Authenticity & Freshness Metadata)
# -----------------------------------------------------------------------------
WEATHER_DESCRIPTIONS = {
    0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
    45: "Fog", 48: "Depositing rime fog",
    51: "Light drizzle", 53: "Moderate drizzle", 55: "Dense drizzle",
    61: "Slight rain", 63: "Moderate rain", 65: "Heavy rain",
    71: "Slight snow", 73: "Moderate snow", 75: "Heavy snow",
    80: "Slight rain showers", 81: "Moderate rain showers", 82: "Violent rain showers",
    95: "Thunderstorm", 96: "Thunderstorm with slight hail", 99: "Thunderstorm with heavy hail",
}

def fetch_weather(lat: float, lon: float, force_fallback: bool = False) -> dict:
    now_iso = datetime.now(timezone.utc).isoformat()
    if force_fallback:
        return {
            "temperature": 29.5,
            "humidity": 58,
            "wind_speed": 9.2,
            "uv_index": 5.8,
            "weather_code": 2,
            "description": "Partly cloudy",
            "forecast": [
                {"day": "Today", "temp_max": 33, "temp_min": 24, "weather_code": 2, "description": "Partly cloudy"},
                {"day": "Tomorrow", "temp_max": 34, "temp_min": 25, "weather_code": 1, "description": "Mainly clear"},
                {"day": "Day 3", "temp_max": 32, "temp_min": 23, "weather_code": 61, "description": "Slight rain"},
            ],
            "is_live": False,
            "is_fallback": True,
            "source": "Forced Test Fallback",
            "fallback_reason": "Fallback mode explicitly enabled via query parameter",
            "fetched_at": now_iso,
        }

    url = (
        f"https://api.open-meteo.com/v1/forecast"
        f"?latitude={lat}&longitude={lon}"
        f"&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,uv_index"
        f"&daily=weather_code,temperature_2m_max,temperature_2m_min"
        f"&timezone=auto"
    )
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "WeatherHealthApp/1.0"})
        with urllib.request.urlopen(req, timeout=6) as response:
            data = json.loads(response.read().decode("utf-8"))
            curr = data.get("current", {})
            daily = data.get("daily", {})
            w_code = curr.get("weather_code", 0)

            forecast = []
            days_labels = ["Today", "Tomorrow", "Day 3", "Day 4", "Day 5"]
            t_max = daily.get("temperature_2m_max", [])
            t_min = daily.get("temperature_2m_min", [])
            w_codes = daily.get("weather_code", [])

            for i in range(min(len(days_labels), len(t_max))):
                c = w_codes[i] if i < len(w_codes) else 0
                forecast.append({
                    "day": days_labels[i],
                    "temp_max": t_max[i],
                    "temp_min": t_min[i],
                    "weather_code": c,
                    "description": WEATHER_DESCRIPTIONS.get(c, "Fair"),
                })

            return {
                "temperature": curr.get("temperature_2m", 28.0),
                "humidity": curr.get("relative_humidity_2m", 60),
                "wind_speed": curr.get("wind_speed_10m", 10.0),
                "uv_index": curr.get("uv_index", 5.0),
                "weather_code": w_code,
                "description": WEATHER_DESCRIPTIONS.get(w_code, "Clear"),
                "forecast": forecast,
                "is_live": True,
                "is_fallback": False,
                "source": "Open-Meteo Weather API",
                "fallback_reason": None,
                "fetched_at": now_iso,
            }
    except Exception as e:
        logger.warning(f"Weather API live fetch failed ({e}) -> Activating Fallback")
        return {
            "temperature": 29.0,
            "humidity": 62,
            "wind_speed": 8.5,
            "uv_index": 5.0,
            "weather_code": 2,
            "description": "Partly cloudy",
            "forecast": [
                {"day": "Today", "temp_max": 32, "temp_min": 24, "weather_code": 2, "description": "Partly cloudy"},
                {"day": "Tomorrow", "temp_max": 33, "temp_min": 25, "weather_code": 1, "description": "Mainly clear"},
                {"day": "Day 3", "temp_max": 31, "temp_min": 23, "weather_code": 3, "description": "Overcast"},
            ],
            "is_live": False,
            "is_fallback": True,
            "source": "Fallback Estimate",
            "fallback_reason": f"Open-Meteo connection failure: {str(e)[:45]}",
            "fetched_at": now_iso,
        }

def aqi_category(aqi: float) -> str:
    if aqi <= 50: return "Good"
    elif aqi <= 100: return "Moderate"
    elif aqi <= 150: return "Unhealthy for Sensitive Groups"
    elif aqi <= 200: return "Unhealthy"
    elif aqi <= 300: return "Very Unhealthy"
    return "Hazardous"

def fetch_aqi(lat: float, lon: float, force_fallback: bool = False) -> dict:
    now_iso = datetime.now(timezone.utc).isoformat()
    if force_fallback:
        return {
            "aqi": 142.0,
            "category": "Unhealthy for Sensitive Groups",
            "pm2_5": 52.4,
            "pm10": 98.0,
            "source": "Forced Test Fallback",
            "is_live": False,
            "is_fallback": True,
            "fallback_reason": "Fallback mode explicitly enabled via query parameter",
            "fetched_at": now_iso,
        }

    url = (
        f"https://air-quality-api.open-meteo.com/v1/air-quality"
        f"?latitude={lat}&longitude={lon}"
        f"&current=pm10,pm2_5,us_aqi,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone"
    )
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "WeatherHealthApp/1.0"})
        with urllib.request.urlopen(req, timeout=6) as response:
            data = json.loads(response.read().decode("utf-8"))
            curr = data.get("current", {})
            aqi_val = curr.get("us_aqi") or 85.0
            return {
                "aqi": float(aqi_val),
                "category": aqi_category(aqi_val),
                "pm2_5": curr.get("pm2_5", round(aqi_val * 0.45, 1)),
                "pm10": curr.get("pm10", round(aqi_val * 0.85, 1)),
                "carbon_monoxide": curr.get("carbon_monoxide"),
                "nitrogen_dioxide": curr.get("nitrogen_dioxide"),
                "ozone": curr.get("ozone"),
                "source": "Open-Meteo Air Quality API",
                "is_live": True,
                "is_fallback": False,
                "fallback_reason": None,
                "fetched_at": now_iso,
            }
    except Exception as e:
        logger.warning(f"AQI API live fetch failed ({e}) -> Activating Fallback")
        return {
            "aqi": 115.0,
            "category": "Unhealthy for Sensitive Groups",
            "pm2_5": 41.5,
            "pm10": 85.0,
            "source": "Fallback Estimate",
            "is_live": False,
            "is_fallback": True,
            "fallback_reason": f"Open-Meteo AQI connection failure: {str(e)[:45]}",
            "fetched_at": now_iso,
        }

# -----------------------------------------------------------------------------
# 5. Deterministic Risk Multiplier Engine
# -----------------------------------------------------------------------------
def compute_risk(aqi: float, pm2_5: float, uv: float, temp: float, profile: dict) -> dict:
    risk_order = ["low", "moderate", "high", "severe"]
    color_meta = {
        "low": {"color": "#10b981", "bgColor": "rgba(16, 185, 129, 0.15)", "badge": "Low Risk"},
        "moderate": {"color": "#f59e0b", "bgColor": "rgba(245, 158, 11, 0.15)", "badge": "Moderate Risk"},
        "high": {"color": "#f97316", "bgColor": "rgba(249, 115, 22, 0.15)", "badge": "High Risk"},
        "severe": {"color": "#ef4444", "bgColor": "rgba(239, 68, 68, 0.15)", "badge": "Severe Hazard"},
    }

    base_factors = []
    if aqi > 200 or pm2_5 > 150 or temp >= 40:
        base = "severe"
        if aqi > 200: base_factors.append(f"Hazardous AQI ({int(aqi)})")
        if pm2_5 > 150: base_factors.append(f"Dangerous PM2.5 ({pm2_5} µg/m³)")
        if temp >= 40: base_factors.append(f"Extreme Heat ({temp}°C)")
    elif aqi > 100 or pm2_5 > 35 or temp >= 35 or uv >= 8:
        base = "high"
        if aqi > 100: base_factors.append(f"Unhealthy AQI ({int(aqi)})")
        if pm2_5 > 35: base_factors.append(f"Elevated PM2.5 ({pm2_5} µg/m³)")
        if temp >= 35: base_factors.append(f"High Temp ({temp}°C)")
        if uv >= 8: base_factors.append(f"Very High UV ({uv})")
    elif aqi > 50 or pm2_5 > 12 or temp >= 30 or uv >= 6:
        base = "moderate"
        if aqi > 50: base_factors.append(f"Moderate AQI ({int(aqi)})")
        if pm2_5 > 12: base_factors.append(f"Moderate PM2.5 ({pm2_5} µg/m³)")
        if temp >= 30: base_factors.append(f"Warm Temp ({temp}°C)")
        if uv >= 6: base_factors.append(f"High UV ({uv})")
    else:
        base = "low"
        base_factors.append("Clean atmospheric conditions")

    base_idx = risk_order.index(base)
    escalate_count = 0
    escalation_reasons = []

    conditions = [c.lower() for c in profile.get("conditions", [])]
    age_group = profile.get("age_group", "18-40")
    occupation = profile.get("occupation", "office").lower()
    sensitivity = profile.get("alert_sensitivity", "normal").lower()

    if ("asthma" in conditions or "respiratory" in conditions) and (aqi > 70 or pm2_5 > 25):
        escalate_count += 1
        escalation_reasons.append(f"Asthma Multiplier (+1 level): AQI ({int(aqi)}) triggers bronchial airway inflammation")

    if ("heart_disease" in conditions or "hypertension" in conditions) and (temp >= 33 or aqi > 100):
        escalate_count += 1
        escalation_reasons.append(f"Cardiovascular Multiplier (+1 level): Heat ({temp}°C) / pollution induces cardiac stress")

    if age_group in ["60+", "under_18"] and (aqi > 80 or uv >= 7 or temp >= 34):
        escalate_count += 1
        escalation_reasons.append(f"Vulnerable Age Demographic Multiplier (+1 level): {age_group.replace('_', ' ')} vulnerability")

    is_outdoor = occupation in ["outdoor_worker", "athlete", "delivery", "construction"]
    if is_outdoor and (aqi > 75 or temp >= 32):
        escalate_count += 1
        escalation_reasons.append(f"Outdoor Exposure Multiplier (+1 level): Continuous atmospheric exposure ({occupation.replace('_', ' ')})")

    if sensitivity == "high" and escalate_count == 0 and base_idx > 0:
        escalate_count += 1
        escalation_reasons.append("High Alert Sensitivity Multiplier (+1 level)")

    final_idx = min(len(risk_order) - 1, base_idx + escalate_count)
    final_risk = risk_order[final_idx]

    numeric_score = min(100.0, (aqi * 0.4) + (pm2_5 * 0.3) + (uv * 3.5) + (temp * 0.5))
    if "asthma" in conditions: numeric_score *= 1.25
    if is_outdoor: numeric_score *= 1.20
    if age_group in ["60+", "under_18"]: numeric_score *= 1.15

    multipliers = {
        "asthma_multiplier": 1.50 if "asthma" in conditions else 1.0,
        "cardiac_multiplier": 1.35 if ("heart_disease" in conditions or "hypertension" in conditions) else 1.0,
        "age_multiplier": 1.30 if age_group in ["60+", "under_18"] else 1.0,
        "exposure_multiplier": 1.25 if is_outdoor else 1.0,
        "sensitivity_multiplier": 1.15 if sensitivity == "high" else 1.0,
    }

    return {
        "risk_level": final_risk,
        "base_risk": base,
        "is_escalated": final_idx > base_idx,
        "escalation_count": escalate_count,
        "escalation_reasons": escalation_reasons,
        "base_factors": base_factors,
        "multipliers": multipliers,
        "numeric_score": round(numeric_score, 1),
        "badge": color_meta[final_risk]["badge"],
        "color": color_meta[final_risk]["color"],
        "bg_color": color_meta[final_risk]["bgColor"],
    }

# -----------------------------------------------------------------------------
# 6. Advisory Generation (Hugging Face / Qwen 72B + Fallback Heuristics)
# -----------------------------------------------------------------------------
ADVISORY_CACHE = {}
LLM_CIRCUIT_FAILURES = 0
LLM_CIRCUIT_LAST_FAIL = 0

def generate_advisory(aqi: float, pm2_5: float, uv: float, temp: float, risk_info: dict, profile: dict) -> dict:
    global LLM_CIRCUIT_FAILURES, LLM_CIRCUIT_LAST_FAIL
    conditions = [c.lower() for c in profile.get("conditions", [])]
    occupation = profile.get("occupation", "office").lower()
    risk_level = risk_info.get("risk_level", "moderate")
    cache_key = f"{profile.get('age_group')}:{'-'.join(sorted(conditions))}:{occupation}:{risk_level}:{int(aqi/20)}"
    now = time.time()
    if cache_key in ADVISORY_CACHE and now - ADVISORY_CACHE[cache_key]["time"] < 60:
        return ADVISORY_CACHE[cache_key]["data"]

    can_try_llm = (LLM_CIRCUIT_FAILURES < 2) or (now - LLM_CIRCUIT_LAST_FAIL > 45)

    # 1. Try Hugging Face Inference Router (Qwen 2.5 72B)
    if can_try_llm and HF_TOKEN and HF_TOKEN.strip():
        try:
            model_name = HF_MODEL or "Qwen/Qwen2.5-72B-Instruct"
            prompt = (
                f"You are an empathetic, clinical public health advisory assistant. "
                f"Write a 3-4 sentence plain-English, non-alarmist health advisory for this person: "
                f"Age group: {profile.get('age_group')}, Occupation: {occupation}, "
                f"Health conditions: {conditions}. "
                f"Environmental data: AQI: {aqi}, PM2.5: {pm2_5} ug/m3, Temp: {temp}C, UV: {uv}. "
                f"Computed risk level: {risk_level.upper()}. "
                f"Be concrete on recommendations (e.g., mask type, peak hour avoidance, hydration, indoor ventilation). "
                f"Respond in valid JSON format with exactly three keys: 'headline' (string), 'advisory_text' (string), and 'action_items' (list of 3 short strings)."
            )
            req = urllib.request.Request(
                "https://router.huggingface.co/v1/chat/completions",
                headers={"Authorization": f"Bearer {HF_TOKEN}", "Content-Type": "application/json"},
                data=json.dumps({
                    "model": model_name,
                    "messages": [
                        {"role": "system", "content": "You are an expert public health AI. Output pure JSON only."},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.3,
                    "max_tokens": 260,
                }).encode(),
            )
            with urllib.request.urlopen(req, timeout=2.8) as r:
                res_data = json.loads(r.read().decode())
                content = res_data["choices"][0]["message"]["content"].strip()
                if "```json" in content:
                    content = content.split("```json")[1].split("```")[0].strip()
                elif "```" in content:
                    content = content.split("```")[1].split("```")[0].strip()
                parsed = json.loads(content)
                short_name = model_name.split("/")[-1].replace("-Instruct", "")
                result = {
                    "headline": parsed.get("headline", f"{risk_info['badge']} — Tailored Advisory"),
                    "advisory_text": parsed.get("advisory_text"),
                    "action_items": parsed.get("action_items", []),
                    "engine_mode": f"AI-generated ({short_name})",
                    "model_used": f"HuggingFace {model_name}",
                    "is_llm": True,
                }
                LLM_CIRCUIT_FAILURES = 0
                ADVISORY_CACHE[cache_key] = {"time": now, "data": result}
                return result
        except Exception as e:
            LLM_CIRCUIT_FAILURES += 1
            LLM_CIRCUIT_LAST_FAIL = time.time()
            logger.warning(f"HuggingFace LLM call error: {e}. Falling back...")

    # 2. Try Groq (Llama 3.3)
    if GROQ_API_KEY and GROQ_API_KEY.strip():
        try:
            prompt = (
                f"You are a public health assistant. Write a short (3-4 sentence) health advisory for: "
                f"Age: {profile.get('age_group')}, occupation: {occupation}, conditions: {conditions}. "
                f"AQI: {aqi}, PM2.5: {pm2_5} ug/m3, Temp: {temp}C, UV: {uv}, Risk: {risk_level}. "
                f"Respond with pure JSON: {{'headline': '...', 'advisory_text': '...', 'action_items': ['...', '...', '...']}}"
            )
            req = urllib.request.Request(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"},
                data=json.dumps({
                    "model": "llama-3.3-70b-versatile",
                    "messages": [{"role": "user", "content": prompt}],
                    "response_format": {"type": "json_object"},
                    "temperature": 0.3,
                    "max_tokens": 260,
                }).encode(),
            )
            with urllib.request.urlopen(req, timeout=7) as r:
                res_data = json.loads(r.read().decode())
                parsed = json.loads(res_data["choices"][0]["message"]["content"])
                return {
                    "headline": parsed.get("headline", f"{risk_info['badge']} — Tailored Advisory"),
                    "advisory_text": parsed.get("advisory_text"),
                    "action_items": parsed.get("action_items", []),
                    "engine_mode": "AI-generated (Groq)",
                    "model_used": "Groq Llama 3.3",
                    "is_llm": True,
                }
        except Exception as e:
            logger.warning(f"Groq API call error: {e}. Falling back...")

    # 3. Deterministic Clinical Heuristic Fallback
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

    result = {
        "headline": headline,
        "advisory_text": " ".join(sentences),
        "action_items": actions[:4],
        "engine_mode": "Heuristic fallback (no LLM)",
        "model_used": "Deterministic Clinical Heuristic",
        "is_llm": False,
    }
    ADVISORY_CACHE[cache_key] = {"time": now, "data": result}
    return result

def evaluate_single_persona(persona: dict, weather: dict, aqi_data: dict) -> dict:
    prof = persona["profile"]
    r_info = compute_risk(aqi_data["aqi"], aqi_data["pm2_5"], weather["uv_index"], weather["temperature"], prof)
    adv = generate_advisory(aqi_data["aqi"], aqi_data["pm2_5"], weather["uv_index"], weather["temperature"], r_info, prof)

    if r_info.get("escalation_reasons"):
        why_line = r_info["escalation_reasons"][0]
    elif prof.get("conditions") and prof["conditions"] != ["none"]:
        why_line = f"Personal health factor: {', '.join(prof['conditions']).replace('_', ' ')}."
    else:
        why_line = "Standard baseline — minimal vulnerability to current atmospheric conditions."

    return {
        "id": persona["user_id"],
        "name": persona["name"],
        "email": persona["email"],
        "picture": persona["picture"],
        "age_group": prof.get("age_group"),
        "occupation": prof.get("occupation"),
        "conditions": prof.get("conditions", []),
        "risk_level": r_info["risk_level"],
        "badge": r_info["badge"],
        "color": r_info["color"],
        "bg_color": r_info["bg_color"],
        "numeric_score": r_info["numeric_score"],
        "is_escalated": r_info["is_escalated"],
        "escalation_count": r_info["escalation_count"],
        "why_reason": why_line,
        "headline": adv["headline"],
        "advisory_snippet": adv["advisory_text"],
        "primary_action": adv["action_items"][0] if adv.get("action_items") else "Monitor local conditions",
        "engine_mode": adv.get("engine_mode", "Heuristic fallback (no LLM)"),
        "is_llm": adv.get("is_llm", False),
    }

# -----------------------------------------------------------------------------
# 7. Automated Evaluation & Scheduler Service
# -----------------------------------------------------------------------------
def evaluate_and_notify_user(uid: str):
    user = db_get_user(uid)
    profile = db_get_profile(uid)
    if not user or not profile:
        return None

    loc = profile["location"]
    weather = fetch_weather(loc["lat"], loc["lon"])
    aqi_data = fetch_aqi(loc["lat"], loc["lon"])
    risk_info = compute_risk(aqi_data["aqi"], aqi_data["pm2_5"], weather["uv_index"], weather["temperature"], profile)
    advisory = generate_advisory(aqi_data["aqi"], aqi_data["pm2_5"], weather["uv_index"], weather["temperature"], risk_info, profile)
    now = datetime.now(timezone.utc)

    channels = []
    if profile.get("notify_email", True):
        channels.append("email")
    if profile.get("notify_sms", False):
        channels.append("sms")
    if not channels:
        channels.append("in-app")

    alert_doc = {
        "id": f"alert-{uid}-{int(now.timestamp())}",
        "user_id": uid,
        "timestamp": now.strftime("%b %d, %I:%M %p"),
        "risk_level": risk_info["risk_level"],
        "headline": advisory["headline"],
        "advisory_text": advisory["advisory_text"],
        "explanation": risk_info["escalation_reasons"] or risk_info["base_factors"],
        "action_items": advisory["action_items"],
        "channel_sent": channels,
    }
    db_save_alert(alert_doc)

    # Real dispatch if email notification enabled
    if profile.get("notify_email", True):
        subject = f"⚠️ [AeroHealth Alert] {risk_info['risk_level'].upper()}: {loc['label']}"
        send_email_notification(
            to_email=user["email"],
            subject=subject,
            headline=advisory["headline"],
            advisory_text=advisory["advisory_text"],
            risk_level=risk_info["risk_level"],
            action_items=advisory["action_items"],
            location_label=loc["label"],
        )

    # Real dispatch if SMS notification enabled
    if profile.get("notify_sms", False) and profile.get("phone"):
        sms_body = f"AeroHealth ({risk_info['risk_level'].upper()}): {advisory['headline']}. {advisory['advisory_text'][:80]}..."
        send_sms_notification(profile["phone"], sms_body)

    return alert_doc

def background_scheduler_worker():
    while True:
        time.sleep(SCHEDULER_INTERVAL_MINUTES * 60)
        try:
            logger.info("Running background periodic health check across monitored users...")
            for uid in list(USERS_DB.keys()):
                evaluate_and_notify_user(uid)
        except Exception as e:
            logger.error(f"Background scheduler worker exception: {e}")

sched_thread = threading.Thread(target=background_scheduler_worker, daemon=True)
sched_thread.start()

# -----------------------------------------------------------------------------
# 8. HTTP Handler & REST API Endpoints
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
        try:
            body = json.dumps(data).encode("utf-8")
            self.send_response(status_code)
            self._send_cors_headers()
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        except (ConnectionResetError, ConnectionAbortedError, BrokenPipeError, OSError):
            pass

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
            if token.startswith("token-"):
                return token.replace("token-", "")
            if token in USERS_DB:
                return token
        return "demo-asthma-worker"

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        # 1. Web Application & Documentation
        if path == "/" or path == "/app":
            accept_header = self.headers.get("Accept", "")
            if "application/json" in accept_header and path == "/":
                self._send_json({
                    "app": "Personalized Weather-Health Advisory API",
                    "status": "online",
                    "version": "1.0.0",
                    "docs_url": "/docs",
                    "ui_url": "/app",
                    "database": "MongoDB Atlas" if mongo_connected else "In-Memory Resilience Mode",
                    "engine_mode": ACTIVE_LLM_MODE,
                })
                return

            app_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend", "public", "app.html")
            if os.path.exists(app_path):
                with open(app_path, "rb") as f:
                    content = f.read()
                self.send_response(200)
                self._send_cors_headers()
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(content)))
                self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
                self.send_header("Pragma", "no-cache")
                self.send_header("Expires", "0")
                self.end_headers()
                self.wfile.write(content)
                return
            else:
                self._send_json({"app": "Personalized Weather-Health Advisory", "status": "online", "docs_url": "/docs"})
                return

        elif path == "/docs":
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
                    "/api/compare-personas": {"get": {"summary": "Parallel persona risk comparison under current conditions"}},
                    "/api/system-status": {"get": {"summary": "Live status of all connected services (MongoDB, LLM, SMTP, SMS, OAuth)"}},
                    "/auth/personas": {"get": {"summary": "List available hackathon demo personas"}},
                    "/auth/demo-login": {"post": {"summary": "Instant demo login as chosen persona"}},
                    "/auth/google": {"get": {"summary": "Google OAuth 2.0 login redirect"}},
                    "/auth/google/callback": {"get": {"summary": "Google OAuth 2.0 exchange callback"}},
                    "/api/profile": {"post": {"summary": "Update user health profile"}},
                    "/api/history": {"get": {"summary": "Get 7-day snapshots and past alerts"}},
                    "/api/location": {"post": {"summary": "Update monitored location coordinates"}},
                    "/api/search-cities": {"get": {"summary": "Live city geocoding search"}},
                    "/api/advisory/generate": {"post": {"summary": "On-demand advisory generation with scenario simulations"}},
                    "/api/scheduler/trigger": {"post": {"summary": "Trigger automated alert evaluation immediately"}},
                    "/api/notifications/test-email": {"post": {"summary": "Dispatch real test alert email to configured SMTP recipient"}},
                },
            })
            return

        # 2. System Status & Services Integration Transparency
        elif path == "/api/system-status":
            self._send_json({
                "database": {
                    "provider": "MongoDB Atlas" if mongo_connected else "In-Memory Resilience Mode",
                    "connected": mongo_connected,
                    "db_name": MONGO_DB_NAME if mongo_connected else None,
                    "uri_configured": bool(MONGO_URI),
                },
                "llm": {
                    "engine_mode": ACTIVE_LLM_MODE,
                    "model": HF_MODEL,
                    "token_present": bool(HF_TOKEN),
                    "circuit_breaker_failures": LLM_CIRCUIT_FAILURES,
                },
                "smtp": {
                    "configured": bool(SMTP_USER and SMTP_PASSWORD),
                    "user": SMTP_USER,
                    "host": f"{SMTP_HOST}:{SMTP_PORT}",
                },
                "sms": {
                    "provider": SMS_PROVIDER,
                    "key_present": bool(FAST2SMS_API_KEY),
                },
                "google_oauth": {
                    "configured": bool(GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET),
                    "client_id": (GOOGLE_CLIENT_ID[:18] + "...") if GOOGLE_CLIENT_ID else None,
                    "redirect_uri": GOOGLE_REDIRECT_URI,
                },
            })
            return

        # 3. Google OAuth 2.0 Flow
        elif path in ["/auth/google", "/auth/google/login"]:
            if not GOOGLE_CLIENT_ID:
                self._send_json({
                    "error": "Google OAuth is not configured on the server",
                    "hint": "Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to backend/env",
                }, status_code=503)
                return

            scope = urllib.parse.quote("openid email profile")
            red_uri = urllib.parse.quote(GOOGLE_REDIRECT_URI)
            oauth_url = (
                f"https://accounts.google.com/o/oauth2/v2/auth"
                f"?response_type=code"
                f"&client_id={GOOGLE_CLIENT_ID}"
                f"&redirect_uri={red_uri}"
                f"&scope={scope}"
                f"&access_type=offline"
                f"&prompt=consent"
            )
            self.send_response(302)
            self.send_header("Location", oauth_url)
            self.end_headers()
            return

        elif path == "/auth/google/callback":
            code = query.get("code", [None])[0]
            if not code:
                self._send_json({"error": "Missing code in authorization response"}, status_code=400)
                return

            try:
                # Exchange code with Google token endpoint
                token_data = urllib.parse.urlencode({
                    "code": code,
                    "client_id": GOOGLE_CLIENT_ID,
                    "client_secret": GOOGLE_CLIENT_SECRET,
                    "redirect_uri": GOOGLE_REDIRECT_URI,
                    "grant_type": "authorization_code",
                }).encode("utf-8")
                req = urllib.request.Request(
                    "https://oauth2.googleapis.com/token",
                    data=token_data,
                    headers={"Content-Type": "application/x-www-form-urlencoded"},
                )
                with urllib.request.urlopen(req, timeout=8) as resp:
                    tok_res = json.loads(resp.read().decode("utf-8"))
                    g_access_token = tok_res.get("access_token")

                # Fetch Google user profile
                u_req = urllib.request.Request(
                    "https://www.googleapis.com/oauth2/v2/userinfo",
                    headers={"Authorization": f"Bearer {g_access_token}"},
                )
                with urllib.request.urlopen(u_req, timeout=8) as u_resp:
                    g_user = json.loads(u_resp.read().decode("utf-8"))

                g_email = g_user.get("email")
                g_name = g_user.get("name", "Google User")
                g_pic = g_user.get("picture", f"https://api.dicebear.com/7.x/avataaars/svg?seed={g_name}")
                uid = f"google-{g_user.get('id', g_email)}"

                user_doc = {
                    "id": uid,
                    "email": g_email,
                    "name": g_name,
                    "picture": g_pic,
                    "is_demo": False,
                    "auth_provider": "google",
                }
                db_save_user(user_doc)

                existing_profile = db_get_profile(uid)
                if not existing_profile:
                    new_prof = {
                        "age_group": "18-40",
                        "conditions": ["none"],
                        "occupation": "office",
                        "location": {"lat": 28.6139, "lon": 77.2090, "label": "New Delhi, Delhi", "city": "New Delhi", "country": "India"},
                        "notify_email": True,
                        "notify_sms": False,
                        "phone": "",
                        "alert_sensitivity": "normal",
                    }
                    db_save_profile(uid, new_prof)

                dest_redirect = f"/app?token=token-{uid}&login=google&name={urllib.parse.quote(g_name)}"
                self.send_response(302)
                self.send_header("Location", dest_redirect)
                self.end_headers()
                return
            except Exception as ge:
                logger.error(f"Google OAuth callback error: {ge}")
                self._send_json({"error": "Google authentication failed", "details": str(ge)}, status_code=400)
                return

        # 4. Persona Management & Demo Login
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
            user = db_get_user(uid) or DEMO_PERSONAS[0]
            profile = db_get_profile(uid) or DEMO_PERSONAS[0]["profile"]
            self._send_json({"user": user, "profile": profile})
            return

        # 5. Core Live Dashboard
        elif path == "/api/dashboard":
            uid = self._get_auth_user_id()
            user = db_get_user(uid) or DEMO_PERSONAS[0]
            profile = db_get_profile(uid) or DEMO_PERSONAS[0]["profile"]

            loc = profile.get("location", {})
            lat = float(query.get("lat", [loc.get("lat", 23.2547)])[0])
            lon = float(query.get("lon", [loc.get("lon", 77.4029)])[0])
            label = query.get("label", [loc.get("label", "Bhopal, MP")])[0]
            force_fallback = query.get("force_fallback", ["0"])[0] in ["1", "true", "True"]

            weather = fetch_weather(lat, lon, force_fallback=force_fallback)
            aqi_data = fetch_aqi(lat, lon, force_fallback=force_fallback)
            risk_info = compute_risk(aqi_data["aqi"], aqi_data["pm2_5"], weather["uv_index"], weather["temperature"], profile)
            advisory = generate_advisory(aqi_data["aqi"], aqi_data["pm2_5"], weather["uv_index"], weather["temperature"], risk_info, profile)

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
            db_save_snapshot(snap)

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

        # 6. Parallel Persona Comparison View
        elif path == "/api/compare-personas":
            lat = float(query.get("lat", [23.2547])[0])
            lon = float(query.get("lon", [77.4029])[0])
            label = query.get("label", ["Current Monitored Location"])[0]
            force_fallback = query.get("force_fallback", ["0"])[0] in ["1", "true", "True"]

            weather = fetch_weather(lat, lon, force_fallback=force_fallback)
            aqi_data = fetch_aqi(lat, lon, force_fallback=force_fallback)

            with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
                futures = [executor.submit(evaluate_single_persona, p, weather, aqi_data) for p in DEMO_PERSONAS]
                results = [f.result() for f in futures]

            self._send_json({
                "location": {"lat": lat, "lon": lon, "label": label},
                "weather": weather,
                "aqi": aqi_data,
                "personas": results,
            })
            return

        # 7. History and Geocoding
        elif path == "/api/history":
            uid = self._get_auth_user_id()
            days = int(query.get("days", [7])[0])
            user_snaps = db_get_snapshots(uid, limit=14)
            user_alerts = db_get_alerts(uid, limit=15)

            self._send_json({
                "days": days,
                "snapshots": user_snaps,
                "alerts": user_alerts,
                "audit_notifications": AUDIT_NOTIFICATIONS[:15],
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
            user = db_get_user(uid)
            if not user:
                user = {
                    "id": uid,
                    "email": persona["email"],
                    "name": persona["name"],
                    "picture": persona["picture"],
                    "is_demo": True,
                }
                db_save_user(user)
                db_save_profile(uid, persona["profile"])

            profile = db_get_profile(uid) or persona["profile"]
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
            profile = db_get_profile(uid) or {}
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

            db_save_profile(uid, profile)
            self._send_json({"status": "success", "profile": profile})
            return

        elif path == "/api/location":
            uid = self._get_auth_user_id()
            profile = db_get_profile(uid) or {}
            profile["location"] = {
                "lat": body.get("lat", 23.2547),
                "lon": body.get("lon", 77.4029),
                "label": body.get("label", "Bhopal, MP"),
                "city": body.get("city", "Bhopal"),
                "country": body.get("country", "India"),
            }
            db_save_profile(uid, profile)
            self._send_json({"status": "success", "location": profile["location"]})
            return

        elif path == "/api/advisory/generate":
            uid = self._get_auth_user_id()
            profile = db_get_profile(uid) or DEMO_PERSONAS[0]["profile"]
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
            db_save_alert(alert_doc)
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

        elif path == "/api/notifications/test-email":
            uid = self._get_auth_user_id()
            user = db_get_user(uid) or DEMO_PERSONAS[0]
            profile = db_get_profile(uid) or DEMO_PERSONAS[0]["profile"]
            loc = profile.get("location", {"label": "Bhopal, MP"})
            
            target_to = body.get("recipient", SMTP_USER or user.get("email", "test@example.com"))
            dispatch_res = send_email_notification(
                to_email=target_to,
                subject=f"🧪 [AeroHealth Test] Verified Environmental Alert Dispatch ({datetime.now().strftime('%H:%M:%S')})",
                headline="Direct Integration Test: Environmental Health Feed Operational",
                advisory_text="This test alert verifies that your Gmail SMTP notification gateway, personalized health advisory engine, and environmental feed are fully operational and communicating seamlessly.",
                risk_level="high",
                action_items=[
                    "Verify inbox delivery of this AeroHealth advisory email",
                    "Check on-screen transparency tag confirms active LLM engine",
                    "Explore side-by-side persona comparison in dashboard",
                ],
                location_label=loc.get("label", "Monitored Region"),
            )
            self._send_json({
                "status": "success",
                "dispatch": dispatch_res,
                "active_smtp_user": SMTP_USER,
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
            profile = db_get_profile(uid) or {}
            profile["notify_email"] = body.get("notify_email", profile.get("notify_email", True))
            profile["notify_sms"] = body.get("notify_sms", profile.get("notify_sms", False))
            profile["phone"] = body.get("phone", profile.get("phone", ""))
            profile["alert_sensitivity"] = body.get("alert_sensitivity", profile.get("alert_sensitivity", "normal"))
            db_save_profile(uid, profile)
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
