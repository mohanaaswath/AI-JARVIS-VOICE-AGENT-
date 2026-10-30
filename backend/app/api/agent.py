"""Local voice-worker status endpoint."""
from fastapi import APIRouter, Header, HTTPException
from app.config import get_settings
from app.schemas.agent import AgentSettingsUpdate
from app.services.agent_settings_service import AgentSettingsService

from app.services.agent_status_service import read_agent_status
from voice.wake_word import readiness

router = APIRouter()
settings_service = AgentSettingsService()


def _authorize(token: str | None, client_host: str | None) -> None:
    expected = get_settings().LOCAL_AGENT_TOKEN
    if expected and token != expected:
        raise HTTPException(status_code=401, detail="Invalid local agent token.")
    if not expected and client_host not in {"127.0.0.1", "::1", "localhost", None}:
        raise HTTPException(status_code=403, detail="Local agent endpoint is restricted to this computer.")


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
    x_agent_token: str | None = Header(default=None),
) -> dict:
    """Update local privacy and voice settings."""
    _authorize(x_agent_token, None)
    values = body.model_dump(exclude_none=True)
    return {"settings": settings_service.update(values)}
