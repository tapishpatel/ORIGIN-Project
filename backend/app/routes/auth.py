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


from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer(auto_error=False)

async def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> dict:
    if not credentials:
        default_p = DEMO_PERSONAS[0] if DEMO_PERSONAS else {"id": "demo-asthma-worker"}
        uid = default_p.get("user_id", "demo-asthma-worker")
        user = await db.users.find_one({"id": uid})
        return user or {
            "id": uid,
            "email": default_p.get("email", "aditi.asthma@demo.org"),
            "name": default_p.get("name", "Aditi Sharma"),
            "picture": default_p.get("picture", ""),
            "is_demo": True
        }

    token = credentials.credentials
    if token.startswith("token-"):
        uid = token.replace("token-", "")
        user = await db.users.find_one({"id": uid})
        if not user:
            for p in DEMO_PERSONAS:
                if p["user_id"] == uid:
                    user = {
                        "id": p["user_id"],
                        "email": p["email"],
                        "name": p["name"],
                        "picture": p["picture"],
                        "is_demo": True
                    }
                    break
        if user:
            return user

    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        user_id = payload.get("sub")
        if user_id:
            user = await db.users.find_one({"id": user_id})
            if user:
                return user
    except jwt.PyJWTError:
        pass

    for p in DEMO_PERSONAS:
        if p["user_id"] == token:
            return {
                "id": p["user_id"],
                "email": p["email"],
                "name": p["name"],
                "picture": p["picture"],
                "is_demo": True
            }

    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


@router.get("/personas")
async def list_personas():
    """Returns available clinical demo personas for hackathon demonstration."""
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


class SignupRequest(BaseModel):
    name: str = "Registered User"
    email: str
    password: str
    age_group: str = "18-40"
    conditions: List[str] = []
    occupation: str = "office"
    location: Optional[dict] = None
    phone: Optional[str] = ""
    notify_email: Optional[bool] = True
    notify_sms: Optional[bool] = False
    alert_sensitivity: str = "normal"


class LoginRequest(BaseModel):
    email: str
    password: str


@router.post("/signup")
async def signup(req: SignupRequest):
    """Registers a new user, saves their health profile, and returns an access token."""
    email = req.email.strip().lower()
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="A valid email address is required.")
    if not req.password or len(req.password.strip()) < 4:
        raise HTTPException(status_code=400, detail="Password must be at least 4 characters long.")

    existing = await db.users.find_one({"email": email})
    if existing and not existing.get("is_demo"):
        raise HTTPException(status_code=400, detail="An account with this email already exists. Please sign in.")

    import hashlib
    import uuid
    uid = f"user-{uuid.uuid4().hex[:10]}"
    pwd_hash = hashlib.sha256(req.password.strip().encode("utf-8")).hexdigest()
    now = datetime.now(timezone.utc)

    user_doc = {
        "id": uid,
        "_id": uid,
        "email": email,
        "name": req.name.strip() or "User",
        "password_hash": pwd_hash,
        "picture": f"https://api.dicebear.com/7.x/avataaars/svg?seed={req.name.replace(' ', '')}",
        "is_demo": False,
        "created_at": now,
    }
    profile_doc = {
        "user_id": uid,
        "email": email,
        "email_verified": True,
        "age_group": req.age_group,
        "conditions": req.conditions if req.conditions else ["none"],
        "occupation": req.occupation,
        "location": req.location or {
            "lat": 28.6139,
            "lon": 77.2090,
            "label": "New Delhi, Delhi, India",
            "city": "New Delhi",
            "country": "India",
        },
        "notify_email": req.notify_email,
        "notify_sms": req.notify_sms,
        "phone": req.phone or "",
        "alert_sensitivity": req.alert_sensitivity,
        "updated_at": now,
    }

    await db.users.insert_one(user_doc)
    await db.profiles.insert_one(profile_doc)

    token = create_access_token(uid, email)
    user_doc.pop("password_hash", None)
    user_doc.pop("_id", None)
    profile_doc.pop("_id", None)

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user_doc,
        "profile": profile_doc,
        "message": "Account created successfully",
    }


@router.post("/login")
async def login(req: LoginRequest):
    """Authenticates user with email and password."""
    email = req.email.strip().lower()
    if not email or not req.password:
        raise HTTPException(status_code=400, detail="Please provide both email and password.")

    # Check demo personas first
    for p in DEMO_PERSONAS:
        if p["email"].lower() == email:
            token = f"token-{p['user_id']}"
            return {
                "access_token": token,
                "token_type": "bearer",
                "user": {
                    "id": p["user_id"],
                    "name": p["name"],
                    "email": p["email"],
                    "picture": p["picture"],
                    "is_demo": True,
                },
                "profile": p["profile"],
            }

    user = await db.users.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=401, detail="No account registered with this email address.")

    import hashlib
    pwd_hash = hashlib.sha256(req.password.strip().encode("utf-8")).hexdigest()
    if user.get("password_hash") and user["password_hash"] != pwd_hash:
        raise HTTPException(status_code=401, detail="Incorrect password. Please try again.")

    profile = await db.profiles.find_one({"user_id": user["id"]})
    token = create_access_token(user["id"], user["email"])
    user.pop("password_hash", None)
    user.pop("_id", None)
    if profile:
        profile.pop("_id", None)

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user,
        "profile": profile,
    }


@router.post("/demo-login")
async def demo_login(req: DemoLoginRequest):
    """Instant zero-friction login for any of the 4 demo personas."""
    persona = next((p for p in DEMO_PERSONAS if p["user_id"] == req.persona_id), None)
    if not persona:
        raise HTTPException(status_code=404, detail=f"Persona '{req.persona_id}' not found")

    token = f"token-{persona['user_id']}"
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": persona["user_id"],
            "name": persona["name"],
            "email": persona["email"],
            "picture": persona["picture"],
            "is_demo": True,
        },
        "profile": persona["profile"],
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
                "username": name,
                "name": name,
                "picture": picture,
                "google_sub": google_sub,
                "is_demo": False,
                "created_at": now,
            }
            await db.users.insert_one(user)

            # Do NOT insert a default profile. Let the user fill out the form.
            is_new_user = True
        else:
            is_new_user = False
            # Update user data in case their Google profile changed
            await db.users.update_one(
                {"id": user["id"]},
                {"$set": {"username": name, "name": name, "picture": picture}}
            )
            # update the local dict to reflect changes for the token/response
            user["username"] = name
            user["name"] = name
            user["picture"] = picture

        jwt_token = create_access_token(user["id"], user["email"])
        print(f"\n=======================================================")
        print(f"  GOOGLE OAUTH SUCCESSFUL!")
        print(f"  USER: {user['email']}")
        print(f"  ACCESS TOKEN: {jwt_token}")
        print(f"=======================================================\n")

        # Check if they have a profile
        existing_profile = await db.profiles.find_one({"user_id": user["id"]})
        if not existing_profile or is_new_user:
            redirect_target = f"{settings.FRONTEND_URL}/form"
        else:
            redirect_target = settings.FRONTEND_URL

        response = RedirectResponse(redirect_target)
        # Set token as a readable cookie so frontend can extract it without exposing it in the URL
        response.set_cookie(key="aero_auth_token", value=jwt_token, httponly=False, max_age=3600, path="/")
        return response
