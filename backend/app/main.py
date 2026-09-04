from contextlib import asynccontextmanager
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.db.client import db
from app.routes import advisory, auth, history, user, weather
from app.services.scheduler import shutdown_scheduler, start_scheduler

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Initializing Personalized Weather-Health Advisory backend...")
    await db.connect()
    start_scheduler()
    yield
    # Shutdown
    logger.info("Shutting down backend services...")
    shutdown_scheduler()
    await db.disconnect()


app = FastAPI(
    title=settings.APP_NAME,
    description=(
        "Personalized Weather-Health Advisory System — combining live weather, "
        "real-time AQI, personal health profiles, deterministic risk evaluation, "
        "and generative AI advisories."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware for React Vite SPA
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(auth.router)
app.include_router(user.router)
app.include_router(weather.router)
app.include_router(advisory.router)
app.include_router(history.router)



@app.get("/")
async def root():
    return {
        "app": settings.APP_NAME,
        "status": "online",
        "version": "1.0.0",
        "docs_url": "/docs",
        "db_mode": "in-memory-fallback" if db.is_in_memory else "mongodb-atlas",
    }
