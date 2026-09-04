from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Header, Query, status
from fastapi.responses import RedirectResponse
import httpx
import jwt
from pydantic import BaseModel
from app.config import settings
from app.db.client import DEMO_PERSONAS, db

router = APIRouter(prefix="/auth", tags=["auth"])


class DemoLoginRequest(BaseModel):
    persona_id: str


def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=settings.JWT_EXPIRES_MINUTES),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


async def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authentication token",
        )

    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
        user = await db.users.find_one({"id": user_id})
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
        return user
    except jwt.PyJWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired or signature invalid")


@router.get("/personas")
async def list_personas():
    """Lists pre-configured demo personas with different health sensitivities."""
    return [
        {
            "id": p["user_id"],
            "name": p["name"],
            "email": p["email"],
            "picture": p["picture"],
            "occupation": p["profile"]["occupation"],
            "conditions": p["profile"]["conditions"],
            "age_group": p["profile"]["age_group"],
            "location": p["profile"]["location"]["label"],
        }
        for p in DEMO_PERSONAS
    ]


@router.post("/demo-login")
async def demo_login(req: DemoLoginRequest):
    """Instant login as one of the pre-configured demo personas."""
    user = await db.users.find_one({"id": req.persona_id})
    if not user:
        # Fallback to first persona
        persona = next((p for p in DEMO_PERSONAS if p["user_id"] == req.persona_id), DEMO_PERSONAS[0])
        user = {
            "id": persona["user_id"],
            "_id": persona["user_id"],
            "email": persona["email"],
            "name": persona["name"],
            "picture": persona["picture"],
            "is_demo": True,
            "created_at": datetime.now(timezone.utc),
        }
        await db.users.insert_one(user)

    profile = await db.profiles.find_one({"user_id": user["id"]})
    token = create_access_token(user["id"], user["email"])

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user,
        "profile": profile,
    }


@router.get("/google/login")
async def google_login():
    """Redirects to Google OAuth consent screen."""
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=503,
            detail="GOOGLE_CLIENT_ID is not configured. Please use /auth/demo-login for hackathon testing.",
        )
    scope = "openid email profile"
    auth_url = (
        f"https://accounts.google.com/o/oauth2/v2/auth"
        f"?response_type=code"
        f"&client_id={settings.GOOGLE_CLIENT_ID}"
        f"&redirect_uri={settings.GOOGLE_REDIRECT_URI}"
        f"&scope={scope}"
        f"&access_type=offline"
        f"&prompt=consent"
    )
    return RedirectResponse(auth_url)


@router.get("/google/callback")
async def google_callback(code: str = Query(...)):
    """Exchanges Google authorization code for tokens and creates or retrieves user."""
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise HTTPException(status_code=503, detail="Google OAuth not configured")

    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": settings.GOOGLE_REDIRECT_URI,
                "grant_type": "authorization_code",
            },
        )
        if token_resp.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to exchange code for Google token")

        token_data = token_resp.json()
        access_token = token_data.get("access_token")

        # Fetch user info
        userinfo_resp = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if userinfo_resp.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to retrieve Google user profile")

        user_info = userinfo_resp.json()
        google_sub = user_info.get("id")
        email = user_info.get("email")
        name = user_info.get("name", "User")
        picture = user_info.get("picture")

        # Find or create user
        user = await db.users.find_one({"email": email})
        now = datetime.now(timezone.utc)
        if not user:
            user_id = f"user-{google_sub}"
            user = {
                "id": user_id,
                "_id": user_id,
                "email": email,
                "name": name,
                "picture": picture,
                "google_sub": google_sub,
                "is_demo": False,
                "created_at": now,
            }
            await db.users.insert_one(user)

            # Create default profile
            default_profile = {
                "user_id": user_id,
                "age_group": "18-40",
                "conditions": ["none"],
                "occupation": "office",
                "location": {
                    "lat": 23.2547,
                    "lon": 77.4029,
                    "label": "Bhopal, Madhya Pradesh",
                    "city": "Bhopal",
                    "country": "India",
                },
                "notify_email": True,
                "notify_sms": False,
                "phone": "",
                "alert_sensitivity": "normal",
                "updated_at": now,
            }
            await db.profiles.insert_one(default_profile)

        jwt_token = create_access_token(user["id"], user["email"])
        redirect_target = f"{settings.FRONTEND_URL}/#token={jwt_token}"
        return RedirectResponse(redirect_target)
