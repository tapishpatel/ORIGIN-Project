from datetime import datetime, timezone
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
import httpx
from pydantic import BaseModel
from app.db.client import db
from app.db.models import LocationModel
from app.routes.auth import get_current_user
from app.services.aqi import fetch_aqi_data
from app.services.llm import generate_personalized_advisory
from app.services.risk_engine import compute_risk_assessment
from app.services.weather import fetch_weather_data

logger = logging.getLogger("routes.weather")
router = APIRouter(prefix="/api", tags=["weather"])


class UpdateLocationRequest(BaseModel):
    lat: float
    lon: float
    label: str
    city: Optional[str] = ""
    country: Optional[str] = ""


@router.get("/dashboard")
async def get_dashboard(
    lat: Optional[float] = Query(None),
    lon: Optional[float] = Query(None),
    user: dict = Depends(get_current_user),
):
    """
    Main dashboard endpoint:
    Aggregates live weather, air quality metrics, deterministic clinical risk score,
    and the personalized plain-English LLM advisory for the user's profile.
    """
    profile = await db.profiles.find_one({"user_id": user["id"]})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found. Please complete onboarding.")
    # Use query lat/lon if provided (e.g. temporary geolocation test), otherwise user's saved location
    saved_loc = profile.get("location", {})
    target_lat = lat if lat is not None else saved_loc.get("lat", 23.2547)
    target_lon = lon if lon is not None else saved_loc.get("lon", 77.4029)
    label = saved_loc.get("label", f"{target_lat:.2f}, {target_lon:.2f}")

    # Fetch live weather and AQI
    weather = await fetch_weather_data(target_lat, target_lon)
    aqi_data = await fetch_aqi_data(target_lat, target_lon)

    # Compute deterministic personalized risk assessment
    risk_info = compute_risk_assessment(
        aqi=aqi_data["aqi"],
        pm2_5=aqi_data["pm2_5"],
        uv=weather["uv_index"],
        temp=weather["temperature"],
        profile=profile,
    )

    # Generate personalized advisory
    advisory = await generate_personalized_advisory(
        aqi=aqi_data["aqi"],
        pm2_5=aqi_data["pm2_5"],
        uv=weather["uv_index"],
        temp=weather["temperature"],
        risk_info=risk_info,
        profile=profile,
    )

    # Record snapshot in database
    now = datetime.now(timezone.utc)
    snapshot_doc = {
        "id": f"snap-{user['id']}-{int(now.timestamp())}",
        "user_id": user["id"],
        "timestamp": now,
        "aqi": aqi_data["aqi"],
        "pm2_5": aqi_data["pm2_5"],
        "pm10": aqi_data["pm10"],
        "temp_c": weather["temperature"],
        "humidity": weather["humidity"],
        "uv_index": weather["uv_index"],
        "weather_code": weather["weather_code"],
        "location_label": label,
    }
    await db.snapshots.insert_one(snapshot_doc)
    profile.pop("_id", None)

    return {
        "location": {
            "lat": target_lat,
            "lon": target_lon,
            "label": label,
        },
        "weather": weather,
        "aqi": aqi_data,
        "risk": risk_info,
        "advisory": advisory,
        "profile": profile,
        "user": {
            "name": user.get("name"),
            "email": user.get("email"),
            "picture": user.get("picture"),
        },
        "updated_at": now.isoformat(),
    }


@router.post("/location")
async def update_location(req: UpdateLocationRequest, user: dict = Depends(get_current_user)):
    """Updates the user's primary monitoring location."""
    new_location = {
        "lat": req.lat,
        "lon": req.lon,
        "label": req.label,
        "city": req.city or req.label.split(",")[0].strip(),
        "country": req.country or "",
    }

    await db.profiles.update_one(
        {"user_id": user["id"]},
        {"$set": {"location": new_location, "updated_at": datetime.now(timezone.utc)}},
        upsert=True,
    )

    return {"status": "success", "location": new_location}


@router.get("/search-cities")
async def search_cities(
    query: str = Query(..., min_length=2),
    user: dict = Depends(get_current_user)
):
    """Live city geocoding search powered by Open-Meteo Geocoding API."""
    url = f"https://geocoding-api.open-meteo.com/v1/search?name={query}&count=6&language=en&format=json"
    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                data = resp.json()
                results = data.get("results", [])
                formatted = []
                for r in results:
                    name = r.get("name")
                    admin = r.get("admin1", "")
                    country = r.get("country", "")
                    label_parts = [p for p in [name, admin, country] if p]
                    formatted.append({
                        "label": ", ".join(label_parts),
                        "city": name,
                        "country": country,
                        "lat": r.get("latitude"),
                        "lon": r.get("longitude"),
                    })
                return formatted
    except Exception as e:
        logger.error(f"Geocoding search failed: {e}")

    # Fallback popular presets
    presets = [
        {"label": "New Delhi, Delhi, India", "city": "New Delhi", "country": "India", "lat": 28.6139, "lon": 77.2090},
        {"label": "Bhopal, Madhya Pradesh, India", "city": "Bhopal", "country": "India", "lat": 23.2547, "lon": 77.4029},
        {"label": "Mumbai, Maharashtra, India", "city": "Mumbai", "country": "India", "lat": 19.0760, "lon": 72.8777},
        {"label": "Bengaluru, Karnataka, India", "city": "Bengaluru", "country": "India", "lat": 12.9716, "lon": 77.5946},
        {"label": "New York, NY, United States", "city": "New York", "country": "United States", "lat": 40.7128, "lon": -74.0060},
        {"label": "London, England, United Kingdom", "city": "London", "country": "United Kingdom", "lat": 51.5074, "lon": -0.1278},
    ]
    return [p for p in presets if query.lower() in p["label"].lower()]


@router.get("/geocode/reverse")
async def reverse_geocode_endpoint(
    lat: float = Query(...),
    lon: float = Query(...),
):
    """Reverse geocode latitude and longitude to city/state/country label."""
    url = f"https://api.bigdatacloud.net/data/reverse-geocode-client?latitude={lat}&longitude={lon}&localityLanguage=en"
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(url, headers={"User-Agent": "AeroHealth/1.0"})
            if resp.status_code == 200:
                data = resp.json()
                city = data.get("city") or data.get("locality") or data.get("principalSubdivision") or "Current Location"
                state = data.get("principalSubdivision") or ""
                country = data.get("countryName") or "India"
                label = f"{city}, {state}" if state and state != city else f"{city}, {country}"
                return {"city": city, "state": state, "country": country, "label": label, "lat": lat, "lon": lon}
    except Exception as e:
        logger.warning(f"Reverse geocode fallback: {e}")
    return {"city": "Current Location", "state": "", "country": "India", "label": f"{lat:.2f}, {lon:.2f}", "lat": lat, "lon": lon}


@router.get("/geocode/auto")
async def auto_geocode_endpoint():
    """Auto-detect client location via IP geolocation."""
    url = "http://ip-api.com/json/"
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.get(url, headers={"User-Agent": "AeroHealth/1.0"})
            if resp.status_code == 200:
                data = resp.json()
                if data.get("status") == "success":
                    city = data.get("city", "Bhopal")
                    state = data.get("regionName", "Madhya Pradesh")
                    country = data.get("country", "India")
                    lat = float(data.get("lat", 23.2547))
                    lon = float(data.get("lon", 77.4029))
                    label = f"{city}, {state}, {country}" if state else f"{city}, {country}"
                    return {
                        "city": city,
                        "state": state,
                        "country": country,
                        "label": label,
                        "lat": lat,
                        "lon": lon,
                        "ip": data.get("query", ""),
                        "is_auto": True,
                    }
    except Exception as e:
        logger.warning(f"Auto IP geocode error: {e}")
    return {
        "city": "New Delhi",
        "state": "Delhi",
        "country": "India",
        "label": "New Delhi, Delhi, India",
        "lat": 28.6139,
        "lon": 77.2090,
        "is_auto": False,
    }

