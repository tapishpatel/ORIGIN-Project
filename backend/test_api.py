import json
import urllib.request

BASE_URL = "http://127.0.0.1:8000"

def test_endpoint(name, path, method="GET", body=None, headers=None):
    headers = headers or {}
    url = f"{BASE_URL}{path}"
    data = json.dumps(body).encode() if body else None
    if body:
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=10) as res:
            res_body = res.read().decode()
            try:
                parsed = json.loads(res_body)
                print(f"PASS: {name} (Status: {res.status})")
                return parsed
            except Exception:
                print(f"PASS: {name} (HTML/Text, {len(res_body)} bytes)")
                return res_body
    except Exception as e:
        print(f"FAIL: {name} - Error: {e}")
        return None

print("=== RUNNING PERSONALIZED WEATHER-HEALTH SYSTEM VERIFICATION ===")

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

# 4. Live Dashboard
dash = test_endpoint("GET /api/dashboard", "/api/dashboard", headers={"Authorization": f"Bearer {token}"})
if dash:
    print(f"  -> Location: {dash.get('location', {}).get('label')}")
    print(f"  -> Temp: {dash.get('weather', {}).get('temperature')}°C, AQI: {dash.get('aqi', {}).get('aqi')}")
    print(f"  -> Risk Level: {dash.get('risk', {}).get('risk_level').upper()} ({dash.get('risk', {}).get('badge')})")
    print(f"  -> Is Escalated: {dash.get('risk', {}).get('is_escalated')} (+{dash.get('risk', {}).get('escalation_count')} steps)")
    print(f"  -> Advisory: {dash.get('advisory', {}).get('headline')}")

# 5. Switch to Senior Citizen (Rajiv Verma)
login_senior = test_endpoint("POST /auth/demo-login (Senior Citizen)", "/auth/demo-login", method="POST", body={"persona_id": "demo-senior-cardiac"})
token_senior = login_senior.get("access_token") if login_senior else None
dash_senior = test_endpoint("GET /api/dashboard (Senior Persona)", "/api/dashboard", headers={"Authorization": f"Bearer {token_senior}"})
if dash_senior:
    print(f"  -> Senior Risk: {dash_senior.get('risk', {}).get('risk_level').upper()} ({dash_senior.get('risk', {}).get('badge')})")
    print(f"  -> Reasons: {dash_senior.get('risk', {}).get('escalation_reasons')}")

# 6. What-If Scenario Simulation
sim_res = test_endpoint("POST /api/advisory/generate (Simulate Severe Spike)", "/api/advisory/generate", method="POST", body={"simulate_aqi": 310, "simulate_temp": 41}, headers={"Authorization": f"Bearer {token}"})
if sim_res:
    print(f"  -> Simulated Risk Level: {sim_res.get('risk', {}).get('risk_level').upper()}")
    print(f"  -> Simulated Headline: {sim_res.get('advisory', {}).get('headline')}")

# 7. 7-Day History & Trends
hist = test_endpoint("GET /api/history?days=7", "/api/history?days=7", headers={"Authorization": f"Bearer {token}"})
if hist:
    print(f"  -> Snapshots recorded: {len(hist.get('snapshots', []))}")
    print(f"  -> Past Alerts recorded: {len(hist.get('alerts', []))}")

# 8. Background Scheduler Trigger
sched = test_endpoint("POST /api/scheduler/trigger", "/api/scheduler/trigger", method="POST", headers={"Authorization": f"Bearer {token}"})
if sched:
    print(f"  -> Scheduler alert triggered: {sched.get('triggered_alert')}")

print("\n=== ALL SYSTEM VERIFICATION CHECKS COMPLETED ===")
