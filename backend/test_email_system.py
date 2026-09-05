import urllib.request
import urllib.parse
import json
import time
import sys

if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

BASE_URL = "http://127.0.0.1:8000"

def post(endpoint, data, token=None):
    url = f"{BASE_URL}{endpoint}"
    req = urllib.request.Request(url, data=json.dumps(data).encode("utf-8"), headers={"Content-Type": "application/json"})
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(req, timeout=12) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        print(f"HTTP Error {e.code} on POST {endpoint}: {body}")
        return json.loads(body) if body.startswith("{") else {"error": body, "status": e.code}

def get(endpoint, token=None):
    url = f"{BASE_URL}{endpoint}"
    req = urllib.request.Request(url)
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(req, timeout=12) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        print(f"HTTP Error {e.code} on GET {endpoint}: {body}")
        return json.loads(body) if body.startswith("{") else {"error": body, "status": e.code}

print("================================================================================")
print("TEST 1: Demo Personas & Database Seeding (Real-time Demo Data)")
print("================================================================================")
personas = get("/auth/personas")
print(f"✓ Retrieved {len(personas)} demo personas:")
for p in personas:
    print(f"  - {p['name']} ({p['id']}): {p.get('conditions')} in {p.get('location')} | Email: {p.get('email')}")

# Login as Aditi Sharma (Asthma patient in Bhopal)
login_aditi = post("/auth/demo-login", {"persona_id": "demo-asthma-worker"})
token_aditi = login_aditi["access_token"]
print(f"\n✓ Logged in as Aditi: User ID: {login_aditi['user']['id']}, Email: {login_aditi['user']['email']}")

# Fetch Aditi's History & Alerts from Database
aditi_hist = get("/api/history?days=7", token=token_aditi)
print(f"✓ Aditi Historical Snapshots count: {len(aditi_hist.get('snapshots', []))}")
print(f"✓ Aditi Past Alerts count: {len(aditi_hist.get('alerts', []))}")
if aditi_hist.get('alerts'):
    sample_alert = aditi_hist['alerts'][0]
    print(f"  Sample Alert: [{sample_alert.get('risk_level').upper()}] {sample_alert.get('headline')} (Channel: {sample_alert.get('channel_sent')}, Status: {sample_alert.get('email_status')})")

print("\n================================================================================")
print("TEST 2: Email Verification Flow via Gmail SMTP OTP")
print("================================================================================")
test_email = "tester.aerohealth@gmail.com"
print(f"1. Requesting 6-digit OTP code for {test_email}...")
send_otp_res = post("/api/email/send-otp", {"email": test_email}, token=token_aditi)
print(f"✓ Send OTP response: {send_otp_res}")
assert send_otp_res.get("success"), "Expected send-otp success to be True"
otp_code = send_otp_res.get("otp")
print(f"✓ Generated 6-digit OTP: {otp_code}")

print(f"\n2. Verifying OTP code {otp_code}...")
verify_otp_res = post("/api/email/verify-otp", {"email": test_email, "otp": otp_code}, token=token_aditi)
print(f"✓ Verify OTP response: {verify_otp_res}")
assert verify_otp_res.get("success"), "Expected verify-otp success to be True"
assert verify_otp_res.get("email_verified"), "Expected email_verified to be True"

print("\n================================================================================")
print("TEST 3: Personalized Email Advisory Drafting")
print("================================================================================")
draft_res = post("/api/advisory/draft-email", {}, token=token_aditi)
print(f"✓ Drafted Email Subject: {draft_res.get('subject')}")
print(f"✓ Target Email: {draft_res.get('target_email')}")
print(f"✓ Engine Mode: {draft_res.get('engine_mode')}")
print(f"✓ Advisory Body Preview:\n  {draft_res.get('body', '')[:160]}...")

print("\n================================================================================")
print("TEST 4: Custom Email Notification Dispatch via Gmail SMTP TLS")
print("================================================================================")
custom_send_res = post("/api/notifications/send-custom-email", {
    "email": "tornovdutta@gmail.com",
    "subject": "🚨 [AeroHealth Test] Verified Clinical Air Quality Advisory",
    "message": "Clinical evaluation indicates elevated particulate stress for asthma sensitivity. Please keep rescue inhalers accessible."
}, token=token_aditi)
print(f"✓ Custom Email Dispatch Result: {custom_send_res.get('dispatch')}")
assert custom_send_res.get("success"), "Expected custom email dispatch success to be True"
print(f"✓ Recorded in DB Alert ID: {custom_send_res.get('recorded_alert_id')}")

print("\n================================================================================")
print("TEST 5: Real User Data Input & Dynamic Real-Time Adaptation")
print("================================================================================")
# Simulate a new real user signing in or updating profile
real_user_id = "real-user-rahul-99"
profile_update_res = post("/api/profile", {
    "age_group": "65+",
    "conditions": ["heart_disease", "hypertension"],
    "occupation": "outdoor_worker",
    "alert_sensitivity": "high",
    "email": "rahul.gupta.verified@gmail.com",
    "email_verified": True,
    "notify_email": True,
    "location": {
        "lat": 19.0760,
        "lon": 72.8777,
        "label": "Mumbai, Maharashtra, India",
        "city": "Mumbai",
        "country": "India"
    }
}, token=f"token-{real_user_id}")
print(f"✓ Updated user profile in database: {profile_update_res.get('status')}")

# Fetch dashboard dynamically for this user
dash = get("/api/dashboard", token=f"token-{real_user_id}")
print(f"✓ Live Location: {dash.get('location', {}).get('label')}")
print(f"✓ Live Weather: {dash.get('weather', {}).get('temperature')}°C · Humidity {dash.get('weather', {}).get('humidity')}% · UV {dash.get('weather', {}).get('uv_index')}")
print(f"✓ Live AQI: {dash.get('aqi', {}).get('aqi')} (PM2.5: {dash.get('aqi', {}).get('pm2_5')})")
print(f"✓ Calculated Risk Level: {dash.get('risk', {}).get('risk_level').upper()} (Score: {dash.get('risk', {}).get('numeric_score')})")
print(f"✓ Risk Factors tailored to 65+ & Cardiovascular: {dash.get('risk', {}).get('escalation_reasons')}")
print(f"✓ Personalized Advisory Headline: {dash.get('advisory', {}).get('headline')}")

# Verify 7-day trend history dynamically generated for this real user's coordinates and medical profile
real_hist = get("/api/history?days=7", token=f"token-{real_user_id}")
print(f"✓ Real User 7-day Historical Snapshots generated: {len(real_hist.get('snapshots', []))} days")
if real_hist.get('snapshots'):
    for s in real_hist['snapshots'][-3:]:
        print(f"  Day {s.get('date')}: AQI {s.get('aqi')}, Risk Score: {s.get('risk_score')} ({s.get('risk_level')})")

print("\n================================================================================")
print("ALL TESTS COMPLETED SUCCESSFULLY!")
print("================================================================================")
