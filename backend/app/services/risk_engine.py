from typing import Any, Dict, List


def compute_risk_assessment(
    aqi: float,
    pm2_5: float,
    uv: float,
    temp: float,
    profile: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Two-tier deterministic risk scoring engine:
    1. Base environmental risk from AQI, PM2.5, UV, and heat index.
    2. Personalized multiplier based on health profile (conditions, age group, occupation, sensitivity).
    Provides explicit explainability metrics for hackathon judging and clinical transparency.
    """
    # 1. Determine base environmental risk
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
        base_factors.append("Baseline air quality within acceptable parameters")

    if uv >= 8.0:
        base_factors.append(f"Very High UV index ({uv}) — rapid sunburn & ocular stress risk")
    elif uv >= 6.0:
        base_factors.append(f"High UV index ({uv})")

    if temp >= 38.0:
        base_factors.append(f"Extreme heat stress ({temp}°C)")
    elif temp >= 33.0:
        base_factors.append(f"Elevated ambient temperature ({temp}°C)")

    # 2. Personal escalation factors
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
        escalation_reasons.append("Cardiovascular condition increases vulnerability to systemic vascular inflammation from fine PM2.5.")
    if is_pregnant:
        escalation_reasons.append("Pregnancy requires conservative pollution avoidance to minimize maternal-fetal oxidative stress.")
    if is_outdoor:
        escalation_reasons.append(f"Occupation ({occupation.replace('_', ' ')}) involves sustained ambient exposure and higher tidal volume inhalation.")
    if is_vulnerable_age:
        escalation_reasons.append(f"Age demographic ({age_group}) has heightened susceptibility to environmental extremes.")
    if sensitivity == "high":
        escalation_reasons.append("User set high alert sensitivity preference for early intervention.")

    # Compute escalation steps
    escalate_count = 0
    if has_respiratory or has_cardiac or is_pregnant:
        escalate_count += 1
    if is_outdoor:
        escalate_count += 1
    if is_vulnerable_age:
        escalate_count += 1
    if sensitivity == "high" and (aqi > 80 or uv > 5):
        escalate_count += 1

    levels = ["low", "moderate", "high", "severe"]
    base_idx = levels.index(base)
    
    # Escalate index: 1 step for moderate vulnerability, 2 steps for multiple compounding risks
    additional_steps = 0
    if escalate_count >= 1:
        additional_steps += 1
    if escalate_count >= 3:
        additional_steps += 1

    final_idx = min(base_idx + additional_steps, len(levels) - 1)
    final_risk = levels[final_idx]

    # Numeric score 0 - 100 for gauge visualization
    score_map = {
        "low": 20 + min(15, (aqi / 100) * 10),
        "moderate": 45 + min(20, (aqi / 150) * 15),
        "high": 70 + min(15, (aqi / 200) * 15),
        "severe": 90 + min(10, (aqi / 300) * 10),
    }
    numeric_score = round(min(100.0, score_map[final_risk] + (escalate_count * 3)), 1)

    color_map = {
        "low": {"color": "#10B981", "badge": "Low Risk", "bgColor": "rgba(16, 185, 129, 0.15)"},
        "moderate": {"color": "#F59E0B", "badge": "Moderate Risk", "bgColor": "rgba(245, 158, 11, 0.15)"},
        "high": {"color": "#F97316", "badge": "High Health Risk", "bgColor": "rgba(249, 115, 22, 0.15)"},
        "severe": {"color": "#EF4444", "badge": "Severe Health Warning", "bgColor": "rgba(239, 68, 68, 0.2)"},
    }

    return {
        "risk_level": final_risk,
        "base_risk": base,
        "is_escalated": final_idx > base_idx,
        "escalation_count": escalate_count,
        "escalation_reasons": escalation_reasons,
        "base_factors": base_factors,
        "numeric_score": numeric_score,
        "badge": color_map[final_risk]["badge"],
        "color": color_map[final_risk]["color"],
        "bg_color": color_map[final_risk]["bgColor"],
    }
