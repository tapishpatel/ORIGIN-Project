from datetime import datetime, timezone
from typing import List, Optional
# pyrefly: ignore [missing-import]
from pydantic import BaseModel, Field


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class LocationModel(BaseModel):
    lat: float = 23.2547
    lon: float = 77.4029
    label: str = "Bhopal, Madhya Pradesh"
    city: Optional[str] = "Bhopal"
    country: Optional[str] = "India"


class UserModel(BaseModel):
    id: str
    email: str
    name: str
    picture: Optional[str] = None
    google_sub: Optional[str] = None
    is_demo: bool = False
    created_at: datetime = Field(default_factory=utc_now)


class ProfileModel(BaseModel):
    user_id: str
    age_group: str = "18-40"  # "under-18", "18-40", "41-60", "60+"
    conditions: List[str] = Field(default_factory=lambda: ["none"])
    occupation: str = "office"  # "outdoor_worker", "office", "student", "athlete", "other"
    location: LocationModel = Field(default_factory=LocationModel)
    notify_email: bool = True
    notify_sms: bool = False
    phone: Optional[str] = ""
    alert_sensitivity: str = "normal"  # "normal", "high"
    updated_at: datetime = Field(default_factory=utc_now)


class SnapshotModel(BaseModel):
    id: Optional[str] = None
    user_id: str
    timestamp: datetime = Field(default_factory=utc_now)
    aqi: float
    pm2_5: float
    pm10: float
    temp_c: float
    humidity: float
    uv_index: float
    weather_code: int
    location_label: str = ""


class AlertModel(BaseModel):
    id: Optional[str] = None
    user_id: str
    timestamp: datetime = Field(default_factory=utc_now)
    risk_level: str  # "low", "moderate", "high", "severe"
    headline: str = ""
    advisory_text: str
    explanation: List[str] = Field(default_factory=list)
    action_items: List[str] = Field(default_factory=list)
    raw_snapshot_id: Optional[str] = None
    channel_sent: List[str] = Field(default_factory=list)
