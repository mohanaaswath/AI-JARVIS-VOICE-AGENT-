"""
api/health.py — GET /api/health
"""
from fastapi import APIRouter
from app.schemas.chat import HealthResponse
from app.config import get_settings

router = APIRouter()


@router.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check() -> HealthResponse:
    settings = get_settings()
    google_ok = bool(settings.GOOGLE_API_KEY)
    livekit_ok = bool(settings.LIVEKIT_API_KEY and settings.LIVEKIT_API_SECRET and settings.LIVEKIT_URL)

    status = "ok" if (google_ok and livekit_ok) else "degraded"
    return HealthResponse(
        status=status,
        google_ai=google_ok,
        livekit=livekit_ok,
    )
