import logging
from datetime import datetime, timezone
from typing import Optional
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.config import settings
from app.db.client import db
from app.services.aqi import fetch_aqi_data
from app.services.llm import generate_personalized_advisory
from app.services.notify import send_email_alert, send_sms_alert
from app.services.risk_engine import compute_risk_assessment
from app.services.weather import fetch_weather_data

logger = logging.getLogger("services.scheduler")
scheduler = AsyncIOScheduler()


async def evaluate_user_and_alert(user_doc: dict, profile_doc: dict) -> Optional[dict]:
    uid = user_doc["id"]
    loc = profile_doc.get("location", {})
    lat = loc.get("lat", 23.2547)
    lon = loc.get("lon", 77.4029)

    weather = await fetch_weather_data(lat, lon)
    aqi_data = await fetch_aqi_data(lat, lon)

    risk_info = compute_risk_assessment(
        aqi=aqi_data["aqi"],
        pm2_5=aqi_data["pm2_5"],
        uv=weather["uv_index"],
        temp=weather["temperature"],
        profile=profile_doc,
    )

    # Check last alert for user
    last_alert = await db.alerts.find_one({"user_id": uid})

    # Trigger alert if risk is high/severe or rose vs last alert or high sensitivity
    should_alert = False
    current_level = risk_info["risk_level"]

    if current_level in ["high", "severe"]:
        should_alert = True
    elif profile_doc.get("alert_sensitivity") == "high" and current_level in ["moderate", "high", "severe"]:
        should_alert = True
    elif not last_alert or last_alert.get("risk_level") != current_level:
        should_alert = True

    if should_alert:
        advisory = await generate_personalized_advisory(
            aqi=aqi_data["aqi"],
            pm2_5=aqi_data["pm2_5"],
            uv=weather["uv_index"],
            temp=weather["temperature"],
            risk_info=risk_info,
            profile=profile_doc,
        )

        channels = []
        if profile_doc.get("notify_email"):
            sent = await send_email_alert(
                recipient=user_doc.get("email", ""),
                subject=f"Health Alert: {risk_info['badge']} in {loc.get('label', 'your area')}",
                headline=advisory["headline"],
                body=advisory["advisory_text"],
                action_items=advisory["action_items"],
            )
            if sent:
                channels.append("email")

        if profile_doc.get("notify_sms") and profile_doc.get("phone"):
            sms_body = f"ALERT ({risk_info['risk_level'].upper()}): {advisory['advisory_text'][:120]}... Check app for guidance."
            sent_sms = await send_sms_alert(profile_doc.get("phone"), sms_body)
            if sent_sms:
                channels.append("sms")

        alert_record = {
            "id": f"alert-{uid}-{int(datetime.now(timezone.utc).timestamp())}",
            "user_id": uid,
            "timestamp": datetime.now(timezone.utc),
            "risk_level": current_level,
            "headline": advisory["headline"],
            "advisory_text": advisory["advisory_text"],
            "explanation": risk_info["escalation_reasons"] or risk_info["base_factors"],
            "action_items": advisory["action_items"],
            "channel_sent": channels,
        }
        await db.alerts.insert_one(alert_record)
        return alert_record

    return None


async def run_periodic_health_checks():
    logger.info("Running scheduled periodic weather & health risk evaluations...")
    cursor = db.users.find({})
    users = await cursor.to_list()
    for user in users:
        profile = await db.profiles.find_one({"user_id": user["id"]})
        if profile:
            try:
                await evaluate_user_and_alert(user, profile)
            except Exception as e:
                logger.error(f"Error in scheduled check for user {user.get('id')}: {e}")


def start_scheduler():
    if not scheduler.running:
        scheduler.add_job(
            run_periodic_health_checks,
            "interval",
            minutes=settings.SCHEDULER_INTERVAL_MINUTES,
            id="periodic_health_check",
            replace_existing=True,
        )
        scheduler.start()
        logger.info(f"APScheduler started (Interval: {settings.SCHEDULER_INTERVAL_MINUTES} min).")


def shutdown_scheduler():
    if scheduler.running:
        scheduler.shutdown()
        logger.info("APScheduler stopped.")
