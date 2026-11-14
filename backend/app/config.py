"""
Configuration module — reads all settings from environment variables.
"""
import os
from functools import lru_cache
from dotenv import load_dotenv

# Load project settings while preferring the frontend/.env file used by this
# local setup. Vite only exposes VITE_* variables to browser code.
_PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
load_dotenv(dotenv_path=os.path.join(_PROJECT_ROOT, ".env"))
load_dotenv(dotenv_path=os.path.join(_PROJECT_ROOT, "frontend", ".env"), override=True)


class Settings:
    # LiveKit
    LIVEKIT_URL: str = os.getenv("LIVEKIT_URL", "")
    LIVEKIT_API_KEY: str = os.getenv("LIVEKIT_API_KEY", "")
    LIVEKIT_API_SECRET: str = os.getenv("LIVEKIT_API_SECRET", "")
    LIVEKIT_AGENT_NAME: str = os.getenv("LIVEKIT_AGENT_NAME", "my-agent")
    LOCAL_AGENT_TOKEN: str = os.getenv("LOCAL_AGENT_TOKEN", "")
    API_AUTH_TOKEN: str = os.getenv("API_AUTH_TOKEN", "")

    # App
    APP_ENV: str = os.getenv("APP_ENV", "development").lower()
    HTTPS_ONLY: bool = os.getenv("HTTPS_ONLY", "false").lower() == "true"
    ALLOWED_ORIGINS: list[str] = os.getenv(
        "ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000"
    ).split(",")
    ALLOWED_ORIGINS = [origin.strip().rstrip("/") for origin in ALLOWED_ORIGINS if origin.strip()]
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
