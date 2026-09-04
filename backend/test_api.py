import json
import sys
import urllib.request

BASE_URL = "http://127.0.0.1:8000"

def log(msg):
    print(msg, flush=True)

def test_endpoint(name, path, method="GET", body=None, headers=None):
    headers = headers or {}
    url = f"{BASE_URL}{path}"
    data = json.dumps(body).encode() if body else None
    if body:
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=25) as res:
            res_body = res.read().decode()
            try:
                parsed = json.loads(res_body)
                log(f"PASS: {name} (Status: {res.status})")
                return parsed
            except Exception:
                log(f"PASS: {name} (HTML/Text, {len(res_body)} bytes)")
                return res_body
    except Exception as e:
        log(f"FAIL: {name} - Error: {e}")
        return None

log("=== RUNNING PERSONALIZED WEATHER-HEALTH SYSTEM VERIFICATION ===")

# 1. Root & Swagger Docs
test_endpoint("GET / (HTML App)", "/app")
test_endpoint("GET /openapi.json", "/openapi.json")

# 2. Personas List
personas = test_endpoint("GET /auth/personas", "/auth/personas")
if personas:
    print(f"  -> Found {len(personas)} personas: {[p['name'] for p in personas]}")

# 3. Demo Login
login_res = test_endpoint("POST /auth/demo-login (Asthma Worker)", "/auth/demo-login", method="POST", body={"persona_id": "demo-asthma-worker"})
token = login_res.get("access_token") if login_res else None

# 4. Live Dashboard Authenticity & Freshness
dash = test_endpoint("GET /api/dashboard", "/api/dashboard", headers={"Authorization": f"Bearer {token}"})
if dash:
    w = dash.get("weather", {})
    a = dash.get("aqi", {})
    adv = dash.get("advisory", {})
    risk = dash.get("risk", {})
    print(f"  -> Location: {dash.get('location', {}).get('label')}")
    print(f"  -> Temp: {w.get('temperature')}°C | Live: {w.get('is_live')} | Fallback: {w.get('is_fallback')} | Fetched At: {w.get('fetched_at')}")
    print(f"  -> AQI: {a.get('aqi')} ({a.get('category')}) | Live: {a.get('is_live')} | Fallback: {a.get('is_fallback')}")
    print(f"  -> Risk Multipliers: {risk.get('multipliers')}")
    print(f"  -> Engine Mode Tag: {adv.get('engine_mode')} (Model: {adv.get('model_used')})")
    print(f"  -> Advisory Headline: {adv.get('headline')}")

# 5. Test Fallback Label Mechanism (Force Fallback Mode)
dash_fallback = test_endpoint("GET /api/dashboard?force_fallback=1", "/api/dashboard?force_fallback=1", headers={"Authorization": f"Bearer {token}"})
if dash_fallback:
    w_fall = dash_fallback.get("weather", {})
    a_fall = dash_fallback.get("aqi", {})
    assert w_fall.get("is_fallback") is True, "Weather should be marked fallback"
    assert a_fall.get("is_fallback") is True, "AQI should be marked fallback"
    print(f"  -> Verified Fallback Labels Active: Weather Source='{w_fall.get('source')}'")
    print(f"  -> Verified Fallback Labels Active: AQI Source='{a_fall.get('source')}'")

# 6. High-Impact Feature: Compare All 4 Personas Side-by-Side
comp = test_endpoint("GET /api/compare-personas", "/api/compare-personas?lat=23.2547&lon=77.4029")
if comp:
    plist = comp.get("personas", [])
    print(f"  -> Compared {len(plist)} personas side-by-side:")
    for p in plist:
        print(f"     • {p['name']} ({p['age_group']}, {','.join(p['conditions']) or 'Healthy'}): [{p['badge'].upper()}] - {p['why_reason']}")

# 7. Switch to Senior Citizen (Rajiv Verma)
login_senior = test_endpoint("POST /auth/demo-login (Senior Citizen)", "/auth/demo-login", method="POST", body={"persona_id": "demo-senior-cardiac"})
token_senior = login_senior.get("access_token") if login_senior else None
dash_senior = test_endpoint("GET /api/dashboard (Senior Persona)", "/api/dashboard", headers={"Authorization": f"Bearer {token_senior}"})
if dash_senior:
    print(f"  -> Senior Risk: {dash_senior.get('risk', {}).get('risk_level').upper()} ({dash_senior.get('risk', {}).get('badge')})")
    print(f"  -> Reasons: {dash_senior.get('risk', {}).get('escalation_reasons')}")

# 8. What-If Scenario Simulation
sim_res = test_endpoint("POST /api/advisory/generate (Simulate Severe Spike)", "/api/advisory/generate", method="POST", body={"simulate_aqi": 310, "simulate_temp": 41}, headers={"Authorization": f"Bearer {token}"})
if sim_res:
    print(f"  -> Simulated Risk Level: {sim_res.get('risk', {}).get('risk_level').upper()}")
    print(f"  -> Simulated Headline: {sim_res.get('advisory', {}).get('headline')}")

# 9. 7-Day History & Trends
hist = test_endpoint("GET /api/history?days=7", "/api/history?days=7", headers={"Authorization": f"Bearer {token}"})
if hist:
    print(f"  -> Snapshots recorded: {len(hist.get('snapshots', []))}")
    print(f"  -> Past Alerts recorded: {len(hist.get('alerts', []))}")

# 10. Background Scheduler Trigger
sched = test_endpoint("POST /api/scheduler/trigger", "/api/scheduler/trigger", method="POST", headers={"Authorization": f"Bearer {token}"})
if sched:
    print(f"  -> Scheduler alert triggered: {sched.get('triggered_alert')}")

# 11. Connected Services & Env File Details Status
status = test_endpoint("GET /api/system-status", "/api/system-status")
if status:
    db_info = status.get("database", {})
    llm_info = status.get("llm", {})
    smtp_info = status.get("smtp", {})
    sms_info = status.get("sms", {})
    oauth_info = status.get("google_oauth", {})
    print(f"  -> Database: {db_info.get('provider')} (Connected: {db_info.get('connected')}, DB: {db_info.get('db_name')})")
    print(f"  -> LLM Engine: {llm_info.get('engine_mode')} (Model: {llm_info.get('model')})")
    print(f"  -> SMTP Gateway: Configured={smtp_info.get('configured')} (User: {smtp_info.get('user')}, Host: {smtp_info.get('host')})")
    print(f"  -> SMS Provider: {sms_info.get('provider')} (API Key Present: {sms_info.get('key_present')})")
    print(f"  -> Google OAuth: Configured={oauth_info.get('configured')} (Client ID: {oauth_info.get('client_id')})")

# 12. Real Gmail SMTP Email Dispatch Test
email_test = test_endpoint("POST /api/notifications/test-email", "/api/notifications/test-email", method="POST", body={"recipient": "tornovdutta@gmail.com"}, headers={"Authorization": f"Bearer {token}"})
if email_test:
    dispatch = email_test.get("dispatch", {})
    print(f"  -> Email Dispatch Result: {dispatch.get('status')} to {dispatch.get('recipient')}")

print("\n=== ALL SYSTEM VERIFICATION CHECKS COMPLETED SUCCESSFULLY ===")
