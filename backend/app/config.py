import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "Personalized Weather-Health Advisory"
    DEBUG: bool = True
    HOST: str = "127.0.0.1"
    PORT: int = 8000
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "*",
    ]

    # JWT Authentication
    JWT_SECRET: str = "dev-secret-key-health-advisory-2026-super-secure"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRES_MINUTES: int = 60 * 24 * 7

    # Google OAuth 2.0
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/auth/google/callback"
    FRONTEND_URL: str = "http://localhost:5173"

    # Database
    MONGO_URI: str = ""
    MONGO_DB_NAME: str = "weather_health_db"

    # Air Quality Station API
    WAQI_TOKEN: str = "579b464db66ec23bdd00000146c3efd7dd2144ac5e2dec921ad08e50"

    # LLM Providers (Groq / Gemini / HF)
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-1.5-flash"
    HF_TOKEN: str = ""
    HF_MODEL: str = "Qwen/Qwen2.5-72B-Instruct"

    # Notifications
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMS_PROVIDER: str = "mock"  # "fast2sms" or "twilio" or "mock"
    FAST2SMS_API_KEY: str = ""

    # Scheduler
    SCHEDULER_INTERVAL_MINUTES: int = 15

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
