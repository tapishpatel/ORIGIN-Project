from datetime import datetime, timezone
from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.db.client import db
from app.routes.auth import get_current_user
from app.services.aqi import fetch_aqi_data
from app.services.llm import generate_personalized_advisory
from app.services.risk_engine import compute_risk_assessment
from app.services.weather import fetch_weather_data

router = APIRouter(prefix="/api/advisory", tags=["advisory"])


class ForceGenerateRequest(BaseModel):
    # Optional simulation overrides for demoing
    simulate_aqi: Optional[float] = None
    simulate_temp: Optional[float] = None
    simulate_uv: Optional[float] = None


@router.post("/generate")
async def generate_advisory(
    req: ForceGenerateRequest = ForceGenerateRequest(),
    user: dict = Depends(get_current_user),
):
    """
    On-demand advisory generation.
    Supports optional simulated conditions for live hackathon demonstration of risk threshold spikes.
    """
    profile = await db.profiles.find_one({"user_id": user["id"]})
    if not profile:
        raise HTTPException(status_code=404, detail="Health profile not found")

    loc = profile.get("location", {})
    lat = loc.get("lat", 23.2547)
    lon = loc.get("lon", 77.4029)

    weather = await fetch_weather_data(lat, lon)
    aqi_data = await fetch_aqi_data(lat, lon)

    # Apply simulation overrides if requested
    actual_aqi = req.simulate_aqi if req.simulate_aqi is not None else aqi_data["aqi"]
    actual_pm25 = (
        round(actual_aqi * 0.45, 1) if req.simulate_aqi is not None else aqi_data["pm2_5"]
    )
    actual_temp = req.simulate_temp if req.simulate_temp is not None else weather["temperature"]
    actual_uv = req.simulate_uv if req.simulate_uv is not None else weather["uv_index"]

    risk_info = compute_risk_assessment(
        aqi=actual_aqi,
        pm2_5=actual_pm25,
        uv=actual_uv,
        temp=actual_temp,
        profile=profile,
    )

    advisory = await generate_personalized_advisory(
        aqi=actual_aqi,
        pm2_5=actual_pm25,
        uv=actual_uv,
        temp=actual_temp,
        risk_info=risk_info,
        profile=profile,
    )

    now = datetime.now(timezone.utc)
    alert_record = {
        "id": f"alert-{user['id']}-{int(now.timestamp())}",
        "user_id": user["id"],
        "timestamp": now,
        "risk_level": risk_info["risk_level"],
        "headline": advisory["headline"],
        "advisory_text": advisory["advisory_text"],
        "explanation": risk_info["escalation_reasons"] or risk_info["base_factors"],
        "action_items": advisory["action_items"],
        "channel_sent": ["in-app"],
    }
    await db.alerts.insert_one(alert_record)

    return {
        "risk": risk_info,
        "advisory": advisory,
        "simulated": req.simulate_aqi is not None,
        "recorded_alert_id": alert_record["id"],
    }
