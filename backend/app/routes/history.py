from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import APIRouter, Depends, Query
from app.db.client import db
from app.routes.auth import get_current_user
from app.services.notify import NOTIFICATION_AUDIT_LOG
from app.services.scheduler import evaluate_user_and_alert

router = APIRouter(prefix="/api", tags=["history"])


@router.get("/history")
async def get_history(
    days: int = Query(7, ge=1, le=30),
    user: dict = Depends(get_current_user),
):
    """
    Returns historical environmental snapshots and past advisories
    powering the 7-day trend charts and alert log.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)

    # Fetch snapshots
    cursor = db.snapshots.find({"user_id": user["id"]}).sort("timestamp", 1)
    snapshots = await cursor.to_list()

    # If few snapshots exist, pull the general demo snapshots so charts are never empty
    if len(snapshots) < 4:
        demo_cursor = db.snapshots.find({}).sort("timestamp", 1).limit(10)
        demo_snaps = await demo_cursor.to_list()
        if len(demo_snaps) > len(snapshots):
            snapshots = demo_snaps

    # Format snapshots for Recharts / frontend canvas
    formatted_snaps = []
    for s in snapshots:
        ts = s.get("timestamp")
        time_str = ts.strftime("%a %d, %H:%M") if isinstance(ts, datetime) else str(ts)[:16]
        short_day = ts.strftime("%a") if isinstance(ts, datetime) else "Day"
        formatted_snaps.append({
            "id": s.get("id"),
            "timestamp": time_str,
            "day": short_day,
            "aqi": s.get("aqi", 0),
            "pm2_5": s.get("pm2_5", 0),
            "pm10": s.get("pm10", 0),
            "temp_c": s.get("temp_c", 0),
            "humidity": s.get("humidity", 0),
            "uv_index": s.get("uv_index", 0),
        })

    # Fetch alerts
    alert_cursor = db.alerts.find({"user_id": user["id"]}).sort("timestamp", -1).limit(20)
    alerts = await alert_cursor.to_list()

    formatted_alerts = []
    for a in alerts:
        ts = a.get("timestamp")
        time_str = ts.strftime("%b %d, %I:%M %p") if isinstance(ts, datetime) else str(ts)[:16]
        formatted_alerts.append({
            "id": a.get("id"),
            "timestamp": time_str,
            "risk_level": a.get("risk_level", "moderate"),
            "headline": a.get("headline", "Health Advisory"),
            "advisory_text": a.get("advisory_text", ""),
            "explanation": a.get("explanation", []),
            "action_items": a.get("action_items", []),
            "channel_sent": a.get("channel_sent", []),
        })

    return {
        "days": days,
        "snapshots": formatted_snaps,
        "alerts": formatted_alerts,
        "audit_notifications": NOTIFICATION_AUDIT_LOG[:10],
    }


@router.post("/scheduler/trigger")
async def trigger_scheduler_check(user: dict = Depends(get_current_user)):
    """
    Manually triggers the background scheduler evaluation pipeline immediately for this user.
    Ideal for hackathon presentations to demonstrate automated notifications without waiting 15 mins.
    """
    profile = await db.profiles.find_one({"user_id": user["id"]})
    if not profile:
        return {"status": "skipped", "message": "Profile not found"}

    result = await evaluate_user_and_alert(user, profile)
    return {
        "status": "success",
        "triggered_alert": result is not None,
        "alert_details": result,
        "recent_audit_log": NOTIFICATION_AUDIT_LOG[:5],
    }
