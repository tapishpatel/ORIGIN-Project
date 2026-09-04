import logging
from typing import Any, Dict
import httpx

logger = logging.getLogger("services.weather")

WMO_WEATHER_MAP = {
    0: {"label": "Clear sky", "icon": "Sun", "severity": "good"},
    1: {"label": "Mainly clear", "icon": "SunDim", "severity": "good"},
    2: {"label": "Partly cloudy", "icon": "CloudSun", "severity": "good"},
    3: {"label": "Overcast", "icon": "Cloud", "severity": "moderate"},
    45: {"label": "Foggy", "icon": "CloudFog", "severity": "moderate"},
    48: {"label": "Depositing rime fog", "icon": "CloudFog", "severity": "moderate"},
    51: {"label": "Light drizzle", "icon": "CloudDrizzle", "severity": "moderate"},
    53: {"label": "Moderate drizzle", "icon": "CloudDrizzle", "severity": "moderate"},
    55: {"label": "Dense drizzle", "icon": "CloudRain", "severity": "moderate"},
    61: {"label": "Slight rain", "icon": "CloudRain", "severity": "moderate"},
    63: {"label": "Moderate rain", "icon": "CloudRain", "severity": "moderate"},
    65: {"label": "Heavy rain", "icon": "CloudRainWind", "severity": "high"},
    71: {"label": "Slight snow fall", "icon": "Snowflake", "severity": "moderate"},
    73: {"label": "Moderate snow fall", "icon": "Snowflake", "severity": "moderate"},
    75: {"label": "Heavy snow fall", "icon": "Snowflake", "severity": "high"},
    80: {"label": "Slight rain showers", "icon": "CloudRain", "severity": "moderate"},
    81: {"label": "Moderate rain showers", "icon": "CloudRain", "severity": "moderate"},
    82: {"label": "Violent rain showers", "icon": "CloudLightning", "severity": "severe"},
    95: {"label": "Thunderstorm", "icon": "CloudLightning", "severity": "severe"},
    96: {"label": "Thunderstorm with slight hail", "icon": "CloudLightning", "severity": "severe"},
    99: {"label": "Thunderstorm with heavy hail", "icon": "CloudLightning", "severity": "severe"},
}


async def fetch_weather_data(lat: float, lon: float) -> Dict[str, Any]:
    """
    Fetches live weather conditions from Open-Meteo Weather API.
    """
    url = (
        f"https://api.open-meteo.com/v1/forecast"
        f"?latitude={lat}&longitude={lon}"
        f"&current=temperature_2m,relative_humidity_2m,weather_code,uv_index,wind_speed_10m"
        f"&hourly=temperature_2m,relative_humidity_2m,uv_index"
        f"&timezone=auto"
    )

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            data = resp.json()

            current = data.get("current", {})
            w_code = current.get("weather_code", 0)
            meta = WMO_WEATHER_MAP.get(w_code, {"label": "Fair", "icon": "Sun", "severity": "good"})

            temp = current.get("temperature_2m", 25.0)
            humidity = current.get("relative_humidity_2m", 50.0)
            uv = current.get("uv_index", 5.0)
            wind = current.get("wind_speed_10m", 8.0)

            # Hourly 24h slice for sparklines
            hourly = data.get("hourly", {})
            hours = hourly.get("time", [])[:24]
            temps = hourly.get("temperature_2m", [])[:24]
            uvs = hourly.get("uv_index", [])[:24]

            now = time.time()
            return {
                "temperature": round(float(temp), 1),
                "humidity": round(float(humidity), 1),
                "uv_index": round(float(uv), 1),
                "wind_speed": round(float(wind), 1),
                "weather_code": w_code,
                "condition_label": meta["label"],
                "icon": meta["icon"],
                "severity": meta["severity"],
                "is_live": True,
                "is_fallback": False,
                "source": "Open-Meteo Live Weather API",
                "fetched_at": now,
                "hourly_forecast": [
                    {"time": h, "temp": t, "uv": u}
                    for h, t, u in zip(hours, temps, uvs)
                ],
            }
    except Exception as e:
        logger.error(f"Error fetching Open-Meteo weather for ({lat}, {lon}): {e}")
        # Safe deterministic fallback with explicit metadata
        return {
            "temperature": 28.5,
            "humidity": 60.0,
            "uv_index": 6.2,
            "wind_speed": 10.5,
            "weather_code": 2,
            "condition_label": "Partly cloudy (Estimate)",
            "icon": "CloudSun",
            "severity": "good",
            "is_live": False,
            "is_fallback": True,
            "source": "Fallback Estimate (Open-Meteo Live Feed Unavailable)",
            "fallback_reason": str(e),
            "fetched_at": time.time(),
            "hourly_forecast": [],
        }
