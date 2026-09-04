import asyncio
import logging
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from app.config import settings

logger = logging.getLogger("db")


class InMemoryCursor:
    def __init__(self, items: List[Dict[str, Any]]):
        self._items = items

    def sort(self, key_or_list, direction=1):
        if isinstance(key_or_list, list):
            for key, d in reversed(key_or_list):
                self._items.sort(key=lambda x: x.get(key) or 0, reverse=(d < 0))
        elif isinstance(key_or_list, str):
            self._items.sort(key=lambda x: x.get(key_or_list) or 0, reverse=(direction < 0))
        return self

    def limit(self, n: int):
        self._items = self._items[:n]
        return self

    async def to_list(self, length: Optional[int] = None):
        if length is not None:
            return self._items[:length]
        return list(self._items)

    def __aiter__(self):
        self._iter = iter(self._items)
        return self

    async def __anext__(self):
        try:
            return next(self._iter)
        except StopIteration:
            raise StopAsyncIteration


class InMemoryCollection:
    def __init__(self, name: str):
        self.name = name
        self.docs: Dict[str, Dict[str, Any]] = {}

    def _matches(self, doc: Dict[str, Any], query: Dict[str, Any]) -> bool:
        for k, v in query.items():
            if k == "_id" and doc.get("_id") != v:
                return False
            if k == "id" and doc.get("id") != v:
                return False
            if isinstance(v, dict):
                # Simple operator support e.g. {"$gte": ...}
                doc_val = doc.get(k)
                if "$gte" in v and not (doc_val is not None and doc_val >= v["$gte"]):
                    return False
                if "$lte" in v and not (doc_val is not None and doc_val <= v["$lte"]):
                    return False
                if "$in" in v and doc_val not in v["$in"]:
                    return False
            elif doc.get(k) != v:
                return False
        return True

    async def find_one(self, query: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        for doc in self.docs.values():
            if self._matches(doc, query):
                return dict(doc)
        return None

    def find(self, query: Optional[Dict[str, Any]] = None) -> InMemoryCursor:
        query = query or {}
        matches = [dict(doc) for doc in self.docs.values() if self._matches(doc, query)]
        return InMemoryCursor(matches)

    async def insert_one(self, doc: Dict[str, Any]):
        doc_copy = dict(doc)
        doc_id = str(doc_copy.get("_id") or doc_copy.get("id") or uuid.uuid4())
        doc_copy["_id"] = doc_id
        doc_copy["id"] = doc_id
        self.docs[doc_id] = doc_copy

        class InsertResult:
            inserted_id = doc_id

        return InsertResult()

    async def update_one(self, query: Dict[str, Any], update: Dict[str, Any], upsert: bool = False):
        target_id = None
        for doc_id, doc in self.docs.items():
            if self._matches(doc, query):
                target_id = doc_id
                break

        if target_id is not None:
            doc = self.docs[target_id]
            if "$set" in update:
                doc.update(update["$set"])
            else:
                doc.update(update)
            self.docs[target_id] = doc
        elif upsert:
            new_doc = dict(query)
            if "$set" in update:
                new_doc.update(update["$set"])
            else:
                new_doc.update(update)
            doc_id = str(new_doc.get("_id") or new_doc.get("id") or uuid.uuid4())
            new_doc["_id"] = doc_id
            new_doc["id"] = doc_id
            self.docs[doc_id] = new_doc


class DatabaseWrapper:
    def __init__(self):
        self.is_connected = False
        self.is_in_memory = True
        self.client = None
        self.db = None
        self.users = InMemoryCollection("users")
        self.profiles = InMemoryCollection("profiles")
        self.snapshots = InMemoryCollection("snapshots")
        self.alerts = InMemoryCollection("alerts")

    async def connect(self):
        if settings.MONGO_URI and settings.MONGO_URI.strip():
            try:
                from motor.motor_asyncio import AsyncIOMotorClient

                self.client = AsyncIOMotorClient(settings.MONGO_URI, serverSelectionTimeoutMS=2000)
                # Test connection
                await self.client.admin.command("ping")
                self.db = self.client[settings.MONGO_DB_NAME]
                self.users = self.db["users"]
                self.profiles = self.db["profiles"]
                self.snapshots = self.db["snapshots"]
                self.alerts = self.db["alerts"]
                self.is_connected = True
                self.is_in_memory = False
                logger.info("Successfully connected to MongoDB Atlas.")
                return
            except Exception as e:
                logger.warning(f"Failed to connect to MongoDB Atlas ({e}). Falling back to in-memory store.")

        self.is_connected = True
        self.is_in_memory = True
        logger.info("Using in-memory persistent database store.")

    async def disconnect(self):
        if self.client:
            self.client.close()
            logger.info("MongoDB client disconnected.")


db = DatabaseWrapper()


DEMO_PERSONAS = []

async def seed_demo_data(database: DatabaseWrapper):
    now = datetime.now(timezone.utc)

    for persona in DEMO_PERSONAS:
        uid = persona["user_id"]
        existing = await database.users.find_one({"id": uid})
        if not existing:
            await database.users.insert_one({
                "id": uid,
                "_id": uid,
                "email": persona["email"],
                "name": persona["name"],
                "picture": persona["picture"],
                "is_demo": True,
                "created_at": now - timedelta(days=14),
            })

            profile_data = dict(persona["profile"])
            profile_data["user_id"] = uid
            profile_data["updated_at"] = now
            await database.profiles.insert_one(profile_data)

            # Seed 7-day historical snapshots for trends
            base_aqi = 135 if "asthma" in persona["profile"]["conditions"] else 115
            for i in range(7, 0, -1):
                day_time = now - timedelta(days=i, hours=2)
                # gentle variation pattern
                variation = ((i * 17) % 50) - 20
                aqi_val = max(45, base_aqi + variation)
                pm2_5_val = round(aqi_val * 0.45, 1)
                pm10_val = round(aqi_val * 0.72, 1)
                temp_val = round(28.0 + (i % 4) * 1.5, 1)
                uv_val = round(5.5 + (i % 3) * 1.2, 1)

                snap_id = f"snap-{uid}-{i}"
                await database.snapshots.insert_one({
                    "id": snap_id,
                    "_id": snap_id,
                    "user_id": uid,
                    "timestamp": day_time,
                    "aqi": aqi_val,
                    "pm2_5": pm2_5_val,
                    "pm10": pm10_val,
                    "temp_c": temp_val,
                    "humidity": 55 + (i * 2),
                    "uv_index": uv_val,
                    "weather_code": 1 if i % 2 == 0 else 3,
                    "location_label": persona["profile"]["location"]["label"],
                })

            # Seed 2 historical alerts
            alert1_time = now - timedelta(days=3, hours=4)
            await database.alerts.insert_one({
                "id": f"alert-{uid}-1",
                "_id": f"alert-{uid}-1",
                "user_id": uid,
                "timestamp": alert1_time,
                "risk_level": "high" if "asthma" in persona["profile"]["conditions"] else "moderate",
                "headline": "Elevated PM2.5 Alert — Action Advised",
                "advisory_text": f"Particulate levels reached moderate-high thresholds for {persona['name']}. Outdoor activities should be curtailed between 2 PM and 5 PM. Keep prescribed bronchodilators/inhalers accessible and ventilate indoors with filtered air.",
                "explanation": [
                    "AQI exceeded personal sensitivity threshold (145)",
                    "High ambient particulate concentration (PM2.5: 65 µg/m³)",
                ],
                "action_items": [
                    "Wear an N95 respirator if stepping outside for longer than 20 minutes",
                    "Keep windows closed during afternoon peak traffic hours",
                ],
                "channel_sent": ["email"],
            })
