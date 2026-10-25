"""
api/livekit.py — POST /api/livekit/token
Issues short-lived access tokens so the frontend can join a LiveKit room.
The API secret never leaves the server.
"""
import logging
import uuid
from fastapi import APIRouter, HTTPException, Request
from app.schemas.voice import TokenRequest, TokenResponse
from app.services.livekit_service import LiveKitService
from app.config import get_settings

logger = logging.getLogger(__name__)
router = APIRouter()


def _get_service(request: Request) -> LiveKitService:
    svc: LiveKitService | None = getattr(request.app.state, "livekit_service", None)
    if svc is None or not svc.is_available:
        raise HTTPException(
            status_code=503,
            detail="LiveKit service is not available. Check LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_URL.",
        )
    return svc


@router.post("/livekit/token", response_model=TokenResponse, tags=["LiveKit"])
async def get_livekit_token(body: TokenRequest, request: Request) -> TokenResponse:
    """
    Issues a short-lived LiveKit JWT.
    Frontend uses this token to connect to the LiveKit room where the voice agent runs.
    """
    svc = _get_service(request)
    settings = get_settings()

    try:
        token = svc.create_token(
            room_name=body.room_name,
            participant_identity=body.participant_identity,
            agent_name=settings.LIVEKIT_AGENT_NAME,
        )
        return TokenResponse(
            token=token,
            url=settings.LIVEKIT_URL,
            room_name=body.room_name,
            participant_identity=body.participant_identity,
        )
    except RuntimeError as exc:
        logger.error("LiveKit token error: %s", exc)
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        logger.error("Unexpected LiveKit error: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/livekit/status", tags=["LiveKit"])
async def livekit_status(request: Request) -> dict:
    """Returns whether LiveKit is configured (without revealing secrets)."""
    settings = get_settings()
    return {
        "configured": LiveKitService(
            settings.LIVEKIT_API_KEY,
            settings.LIVEKIT_API_SECRET,
            settings.LIVEKIT_URL,
        ).is_available,
        "url": settings.LIVEKIT_URL or None,
    }
