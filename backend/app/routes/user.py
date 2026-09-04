from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from app.db.client import db
from app.db.models import LocationModel
from app.routes.auth import get_current_user

router = APIRouter(prefix="/api", tags=["user"])


class UpdateProfileRequest(BaseModel):
    age_group: str = "18-40"
    conditions: List[str] = Field(default_factory=list)
    occupation: str = "office"
    location: Optional[LocationModel] = None
    alert_sensitivity: str = "normal"
    notify_email: Optional[bool] = None
    notify_sms: Optional[bool] = None
    phone: Optional[str] = None


class UpdateNotificationRequest(BaseModel):
    notify_email: bool
    notify_sms: bool
    phone: Optional[str] = ""
    alert_sensitivity: str = "normal"


@router.get("/me")
async def get_me(user: dict = Depends(get_current_user)):
    """Returns the authenticated user and their current health profile."""
    profile = await db.profiles.find_one({"user_id": user["id"]})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found. Please complete onboarding.")

    user.pop("_id", None)
    profile.pop("_id", None)
    return {
        "user": user,
        "profile": profile,
    }


@router.post("/profile")
async def update_profile(req: UpdateProfileRequest, user: dict = Depends(get_current_user)):
    """Creates or updates the user's health profile and triggers baseline recalculation."""
    update_data = {
        "age_group": req.age_group,
        "conditions": req.conditions if req.conditions else ["none"],
        "occupation": req.occupation,
        "alert_sensitivity": req.alert_sensitivity,
        "updated_at": datetime.now(timezone.utc),
    }
    if req.location is not None:
        update_data["location"] = req.location.model_dump()
    if req.notify_email is not None:
        update_data["notify_email"] = req.notify_email
    if req.notify_sms is not None:
        update_data["notify_sms"] = req.notify_sms
    if req.phone is not None:
        update_data["phone"] = req.phone

    await db.profiles.update_one(
        {"user_id": user["id"]},
        {"$set": update_data},
        upsert=True,
    )

    updated_profile = await db.profiles.find_one({"user_id": user["id"]})
    if updated_profile:
        updated_profile.pop("_id", None)
    return {"status": "success", "profile": updated_profile}


@router.put("/notifications")
async def update_notifications(req: UpdateNotificationRequest, user: dict = Depends(get_current_user)):
    """Updates notification channels and sensitivity preferences."""
    update_data = {
        "notify_email": req.notify_email,
        "notify_sms": req.notify_sms,
        "phone": req.phone or "",
        "alert_sensitivity": req.alert_sensitivity,
        "updated_at": datetime.now(timezone.utc),
    }

    await db.profiles.update_one(
        {"user_id": user["id"]},
        {"$set": update_data},
        upsert=True,
    )

    return {"status": "success", "notifications": update_data}
