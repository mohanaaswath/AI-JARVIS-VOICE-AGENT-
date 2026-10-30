"""Local voice-worker status endpoint."""
from fastapi import APIRouter

from app.services.agent_status_service import read_agent_status

router = APIRouter()


@router.get("/agent/status", tags=["Agent"])
async def agent_status() -> dict:
    """Return whether the local LiveKit worker heartbeat is current."""
    return read_agent_status()
