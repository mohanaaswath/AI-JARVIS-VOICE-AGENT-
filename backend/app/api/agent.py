"""Local voice-worker status endpoint."""
from fastapi import APIRouter, Depends
from app.security import require_api_auth
from app.schemas.agent import AgentSettingsUpdate
from app.services.agent_settings_service import AgentSettingsService

from app.services.agent_status_service import read_agent_status
from voice.wake_word import readiness

router = APIRouter(dependencies=[Depends(require_api_auth)])
settings_service = AgentSettingsService()


@router.get("/agent/status", tags=["Agent"])
async def agent_status() -> dict:
    """Return whether the local LiveKit worker heartbeat is current."""
    wake_word = readiness()
    return {
        **read_agent_status(),
        "settings": settings_service.get(),
        "wake_word": {
            "available": wake_word.available,
            "reason": wake_word.reason,
            "wake_word": wake_word.wake_word,
        },
    }


@router.patch("/agent/settings", tags=["Agent"])
async def update_agent_settings(
    body: AgentSettingsUpdate,
) -> dict:
    """Update local privacy and voice settings."""
    values = body.model_dump(exclude_none=True)
    return {"settings": settings_service.update(values)}
