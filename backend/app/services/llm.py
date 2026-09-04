import json
import logging
from typing import Any, Dict, List
import httpx
from app.config import settings

logger = logging.getLogger("services.llm")


def build_fallback_advisory(
    aqi: float,
    pm2_5: float,
    uv: float,
    temp: float,
    risk_info: Dict[str, Any],
    profile: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Intelligent deterministic advisory generator used when external LLM API keys
    are not set or when network/rate limits occur. Grounded in clinical public health guidelines.
    """
    conditions = [c.lower() for c in profile.get("conditions", [])]
    occupation = profile.get("occupation", "office").lower()
    age = profile.get("age_group", "18-40")
    risk_level = risk_info.get("risk_level", "moderate")
    name = profile.get("name", "there")

    has_asthma = "asthma" in conditions
    has_cardiac = "heart_disease" in conditions or "hypertension" in conditions
    is_pregnant = "pregnant" in conditions
    is_outdoor = occupation in ["outdoor_worker", "athlete"]

    sentences = []
    actions: List[str] = []

    if risk_level == "severe":
        headline = "Critical Air Quality & Environmental Alert"
        if has_asthma:
            sentences.append(
                "Severe particulate pollution poses an immediate threat to your bronchial airways today."
            )
            sentences.append(
                "Reschedule non-essential outdoor work or errands, and verify that your quick-relief inhaler is within arm's reach."
            )
            actions.append("Strictly wear a certified N95 or KN95 respirator outdoors")
            actions.append("Keep prescribed rescue inhaler accessible at all times")
            actions.append("Seal windows and run an indoor HEPA purifier on maximum")
        elif has_cardiac:
            sentences.append(
                "Fine particulate levels are triggering significant cardiovascular strain today."
            )
            sentences.append(
                "Avoid strenuous physical exertion and remain in temperature-controlled, filtered indoor environments."
            )
            actions.append("Avoid heavy lifting or sudden outdoor exertion")
            actions.append("Stay hydrated and monitor blood pressure/pulse stability")
            actions.append("Use recirculated air conditioning if traveling by car")
        else:
            sentences.append(
                "Ambient air quality has entered hazardous territory for all individuals regardless of prior health."
            )
            sentences.append(
                "Minimise outdoor exposure, especially during peak commute hours, and wear protective filtration when stepping outside."
            )
            actions.append("Wear an N95 mask for any outdoor transit")
            actions.append("Keep residential doors and windows closed")
            actions.append("Postpone high-intensity workouts to an indoor gym")

    elif risk_level == "high":
        headline = "High Health Risk — Protective Actions Recommended"
        if is_outdoor:
            sentences.append(
                f"Given your outdoor occupation and high particulate matter, prolonged exposure will cause noticeable throat and lung irritation."
            )
            sentences.append(
                "Wear an N95 respirator throughout your shift, take frequent breaks in indoor filtered zones, and hydrate generously."
            )
            actions.append("Equip an N95/FFP2 mask during working hours")
            actions.append("Take 10-minute rest intervals inside sheltered, air-conditioned areas")
            actions.append("Rinse eyes and nasal passages with saline after extended outdoor stints")
        elif has_asthma or is_pregnant:
            target = "respiratory sensitivity" if has_asthma else "pregnancy considerations"
            sentences.append(
                f"Airborne particulates are elevated to levels that require extra caution for your {target}."
            )
            sentences.append(
                "Plan indoor activities between 11 AM and 5 PM when heat and ozone peak, and ensure your living space has filtered airflow."
            )
            actions.append("Avoid outdoor walks during afternoon traffic surges")
            actions.append("Ensure indoor spaces remain well-sealed from roadside dust")
            if has_asthma:
                actions.append("Pre-check inhaler dose counter before traveling")
        else:
            sentences.append(
                "Particulate density is elevated, making outdoor cardio and prolonged transit taxing on the respiratory system."
            )
            sentences.append(
                "Consider shifting your jog or workout indoors and close windows facing heavy traffic arteries."
            )
            actions.append("Switch outdoor runs to treadmill or indoor calisthenics")
            actions.append("Keep indoor spaces ventilated with air purifiers")

    elif risk_level == "moderate":
        headline = "Moderate Air Conditions — Mild Caution"
        if has_asthma or has_cardiac:
            sentences.append(
                "While air quality is acceptable for the general public, mild irritants may still trigger subtle throat tightness or fatigue."
            )
            sentences.append(
                "Carry your usual protective medication if you have a busy outdoor day, but normal routines can proceed with reasonable pacing."
            )
            actions.append("Keep maintenance medication or water bottle handy")
            actions.append("Avoid exercising right next to congested arterial highways")
        else:
            sentences.append(
                "Today's atmospheric conditions are relatively balanced, with minor airborne dust typical of urban environments."
            )
            sentences.append(
                "Feel free to enjoy your regular day and outdoor commutes without specialized equipment."
            )
            actions.append("Normal outdoor movement and sports are safe")
            actions.append("Air out living rooms in early morning hours")

    else:  # low
        headline = "Optimal Environmental Conditions"
        sentences.append(
            "Air quality and temperature are in an ideal range today, posing virtually no environmental health hazard."
        )
        sentences.append(
            "It is a great day for outdoor walks, errands, and ventilation of indoor rooms with fresh air."
        )
        actions.append("Excellent window for outdoor exercise and ventilation")
        actions.append("No specialized protective gear required")

    # Add UV / Heat reminder if relevant
    if uv >= 7.0:
        sentences.append(f"UV index is high ({uv}); apply broad-spectrum sunscreen and wear sunglasses if out between 11 AM and 3 PM.")
        actions.append(f"High UV ({uv}): Apply SPF 30+ sunscreen & wear UV400 sunglasses")
    elif temp >= 36.0:
        sentences.append(f"High temperatures ({temp}°C) increase dehydration risk; drink water regularly even if not thirsty.")
        actions.append("Drink at least 2.5 - 3 liters of water across the day")

    return {
        "headline": headline,
        "advisory_text": " ".join(sentences),
        "action_items": actions[:4],
        "model_used": "Deterministic Clinical Heuristic (Fallback Safe)",
    }


async def generate_personalized_advisory(
    aqi: float,
    pm2_5: float,
    uv: float,
    temp: float,
    risk_info: Dict[str, Any],
    profile: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Generates a human-first, personalized advisory.
    Attempts Groq (Llama 3.3/3.1) -> Gemini -> Deterministic Fallback.
    """
    risk_level = risk_info.get("risk_level", "moderate")
    age = profile.get("age_group", "18-40")
    occupation = profile.get("occupation", "office")
    conditions = ", ".join(profile.get("conditions", [])) or "None"
    escalations = "; ".join(risk_info.get("escalation_reasons", []))

    prompt = (
        "You are an empathetic, clinical public health advisory assistant.\n"
        "Given the personal health profile and live environmental metrics below, write a short, "
        "personalized, plain-English, non-alarmist health advisory for THIS specific person.\n\n"
        "GUIDELINES:\n"
        "- Exactly 3 to 4 sentences.\n"
        "- Be highly concrete about what to do (e.g., specific mask type like N95, best time of day to avoid outdoors, "
        "medication reminder tone WITHOUT prescribing specific drug dosages).\n"
        "- Address their specific health condition and occupation directly.\n"
        "- Do NOT repeat the raw numbers in a robotic list.\n"
        "- Also provide exactly 3 concise action bullet points.\n\n"
        f"PERSON PROFILE:\n"
        f"- Age Group: {age}\n"
        f"- Occupation: {occupation}\n"
        f"- Health Conditions: {conditions}\n\n"
        f"CURRENT CONDITIONS:\n"
        f"- Air Quality Index: {aqi} (PM2.5: {pm2_5} µg/m³)\n"
        f"- Temperature: {temp}°C, UV Index: {uv}\n"
        f"- Computed Risk Level: {risk_level.upper()}\n"
        f"- Clinical Factors: {escalations}\n\n"
        "Respond in JSON format with exactly two keys: 'advisory_text' (string) and 'action_items' (list of strings)."
    )

    # 1. Try Groq if configured
    if settings.GROQ_API_KEY and settings.GROQ_API_KEY.strip():
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                res = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {settings.GROQ_API_KEY}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": settings.GROQ_MODEL,
                        "messages": [
                            {"role": "system", "content": "You are a public health AI assistant. Output JSON only."},
                            {"role": "user", "content": prompt},
                        ],
                        "temperature": 0.4,
                        "response_format": {"type": "json_object"},
                    },
                )
                if res.status_code == 200:
                    data = res.json()
                    content = data["choices"][0]["message"]["content"]
                    parsed = json.loads(content)
                    return {
                        "headline": f"{risk_info.get('badge', 'Health Advisory')} — Tailored for You",
                        "advisory_text": parsed.get("advisory_text", ""),
                        "action_items": parsed.get("action_items", []),
                        "model_used": f"Groq ({settings.GROQ_MODEL})",
                    }
                else:
                    logger.warning(f"Groq API returned {res.status_code}: {res.text}")
        except Exception as e:
            logger.warning(f"Groq LLM call failed: {e}. Falling back...")

    # 2. Try Gemini if configured
    if settings.GEMINI_API_KEY and settings.GEMINI_API_KEY.strip():
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.GEMINI_MODEL}:generateContent?key={settings.GEMINI_API_KEY}"
            async with httpx.AsyncClient(timeout=8.0) as client:
                res = await client.post(
                    url,
                    headers={"Content-Type": "application/json"},
                    json={
                        "contents": [{"parts": [{"text": prompt + "\nOutput raw JSON without markdown backticks."}]}],
                        "generationConfig": {"temperature": 0.3},
                    },
                )
                if res.status_code == 200:
                    data = res.json()
                    raw_text = data["candidates"][0]["content"]["parts"][0]["text"]
                    clean_text = raw_text.replace("```json", "").replace("```", "").strip()
                    parsed = json.loads(clean_text)
                    return {
                        "headline": f"{risk_info.get('badge', 'Health Advisory')} — Tailored for You",
                        "advisory_text": parsed.get("advisory_text", ""),
                        "action_items": parsed.get("action_items", []),
                        "model_used": f"Gemini ({settings.GEMINI_MODEL})",
                    }
                else:
                    logger.warning(f"Gemini API returned {res.status_code}: {res.text}")
        except Exception as e:
            logger.warning(f"Gemini LLM call failed: {e}. Falling back...")

    # 3. Deterministic Clinical Heuristic Fallback
    fallback = build_fallback_advisory(aqi, pm2_5, uv, temp, risk_info, profile)
    return fallback
