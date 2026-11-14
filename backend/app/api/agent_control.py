"""
api/agent_control.py — Agent lifecycle control endpoints.

POST /api/agent/activate    — Request JARVIS activation (wake word trigger via API)
POST /api/agent/deactivate  — Request JARVIS deactivation
POST /api/agent/pause       — Pause wake-word listening
POST /api/agent/resume      — Resume wake-word listening
GET  /api/agent/lifecycle   — Full lifecycle state
"""
from __future__ import annotations

import logging
from fastapi import APIRouter, Depends
from app.security import require_api_auth

from app.services.agent_status_service import (
    read_agent_status,
    send_activate_signal,
    send_deactivate_signal,
)

logger = logging.getLogger(__name__)
router = APIRouter(dependencies=[Depends(require_api_auth)])

# Control signal paths for pause/resume
import os
from pathlib import Path

_CONTROL_DIR = Path(os.getenv("LOCALAPPDATA") or os.getenv("TEMP") or ".") / "Jarvis"
_PAUSE_PATH = _CONTROL_DIR / "pause.signal"
_RESUME_PATH = _CONTROL_DIR / "resume.signal"


@router.get("/agent/lifecycle", tags=["Agent"])
async def agent_lifecycle() -> dict:
    """Return the full lifecycle state from the background agent heartbeat."""
    status = read_agent_status()
    return {
        "lifecycle_state": status.get("lifecycle_state", "unknown"),
        "available": status.get("available", False),
        "agent_name": status.get("agent_name"),
        "pid": status.get("pid"),
        "age_seconds": status.get("age_seconds"),
    }


@router.post("/agent/activate", tags=["Agent"])
async def activate_agent() -> dict:
    """
    Request JARVIS activation.  Writes an activate signal file that the
    background agent polls.  Returns immediately; actual activation is async.
    """
    status = read_agent_status()
    lifecycle = status.get("lifecycle_state", "unknown")

    if lifecycle == "active":
        return {"status": "already_active", "message": "JARVIS is already active."}
    if lifecycle == "activating":
        return {"status": "activating", "message": "JARVIS is already activating."}
    if not status.get("available"):
        return {
            "status": "agent_offline",
            "message": "Background agent is not running. Start it first.",
        }

    send_activate_signal()
    return {"status": "activation_requested", "message": "Activation signal sent."}


@router.post("/agent/deactivate", tags=["Agent"])
async def deactivate_agent() -> dict:
    """
    Request JARVIS deactivation.  Returns JARVIS to STANDBY without stopping
    the background process.
    """
    status = read_agent_status()
    lifecycle = status.get("lifecycle_state", "unknown")

    if lifecycle in ("standby", "paused"):
        return {"status": "already_standby", "message": "JARVIS is already in standby."}

    send_deactivate_signal()
    return {"status": "deactivation_requested", "message": "Deactivation signal sent."}


@router.post("/agent/pause", tags=["Agent"])
async def pause_agent() -> dict:
    """Pause wake-word listening (mic goes quiet)."""
    _CONTROL_DIR.mkdir(parents=True, exist_ok=True)
    _PAUSE_PATH.touch()
    return {"status": "pause_requested", "message": "Pause signal sent."}


@router.post("/agent/resume", tags=["Agent"])
async def resume_agent() -> dict:
    """Resume wake-word listening after a pause."""
    _CONTROL_DIR.mkdir(parents=True, exist_ok=True)
    _RESUME_PATH.touch()
    return {"status": "resume_requested", "message": "Resume signal sent."}
