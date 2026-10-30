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

    # App
    ALLOWED_ORIGINS: list[str] = os.getenv(
        "ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000"
    ).split(",")
    DEBUG: bool = os.getenv("DEBUG", "true").lower() == "true"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
