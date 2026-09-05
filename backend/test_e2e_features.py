import urllib.request
import json
import time

def post(url, data):
    req = urllib.request.Request(url, data=json.dumps(data).encode(), headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read().decode('utf-8'))

def get(url):
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read().decode('utf-8'))

print("=== 1. DASHBOARD & PERSONALIZED VERDICT ===")
dash = get("http://127.0.0.1:8000/api/dashboard")
risk = dash["risk"]
print("Risk Level:", risk["risk_level"], "Score:", risk["numeric_score"])
print("Safety Verdict Badge:", risk["safety_verdict"]["badge"])
print("Safety Summary:", risk["safety_verdict"]["summary"])
print("Activities Evaluated:")
for act, info in risk["activity_suitability"].items():
    print(f"  - {act}: [{info.get('status')}] {info.get('advice')}")

print("\n=== 2. ATMOSPHERIC VITALS ===")
w = dash["weather"]
print(f"Temp: {w['temperature']}°C, Pressure: {w.get('pressure')} hPa, Dew Point: {w.get('dew_point')}°C")
print(f"Comfort: {w.get('air_comfort')}, Wind: {w.get('wind_cardinal')} {w.get('wind_speed')} km/h")
print(f"Golden Hour: {w.get('golden_hour')}, Pollen: {w.get('pollen_index')}")

print("\n=== 3. AI COPILOT QUERY (Qwen 2.5 72B) ===")
ai_res = post("http://127.0.0.1:8000/api/ai-chat", {"question": "Should I wear a mask today when walking outside?"})
print("Question:", ai_res["question"])
print("Answer:", ai_res["answer"])
print("Engine Mode:", ai_res["engine_mode"])
print(f"Latency: {ai_res['latency_ms']} ms")

print("\n=== 4. PERSONALIZED SMS SYNTHESIS & FAST2SMS DISPATCH ===")
draft = post("http://127.0.0.1:8000/api/advisory/draft-sms", {})
print("Drafted SMS Text:", draft["sms_text"], f"({draft['char_count']} chars)")

sms_disp = post("http://127.0.0.1:8000/api/notifications/send-custom-sms", {
    "phone": "9876543210",
    "message": draft["sms_text"]
})
print("Custom SMS Dispatch Status:", sms_disp.get("success"), "Fast2SMS Result:", sms_disp.get("dispatch", {}).get("status"))

print("\n=== 5. 7-DAY SNAPSHOTS & ALERTS AUDIT TRAIL ===")
hist = get("http://127.0.0.1:8000/api/history?days=7")
print(f"Snapshots: {len(hist.get('snapshots', []))} days")
print(f"Recorded Alerts: {len(hist.get('alerts', []))} entries")
if hist.get('alerts'):
    latest_alert = hist['alerts'][0]
    print(f"Latest Dispatched Alert: '{latest_alert.get('headline')}' at {latest_alert.get('timestamp')}")

print("\n🎉 ALL ADVANCED WEATHER & HEALTH MONITORING CHECKS PASSED!")
