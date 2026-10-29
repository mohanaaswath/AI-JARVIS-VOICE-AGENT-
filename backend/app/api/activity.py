"""
api/activity.py — FastAPI endpoints for retrieving past system action history and verification logs.
"""
from fastapi import APIRouter, HTTPException, Query
from app.schemas.actions import ActionResult
from app.services import get_activity_service

router = APIRouter()


@router.get("/activity", response_model=list[ActionResult], tags=["Activity"])
async def list_activity(limit: int = Query(default=50, ge=1, le=200)) -> list[ActionResult]:
    """Retrieves recent action execution history and verification outcomes."""
    act_svc = get_activity_service()
    return act_svc.get_activities(limit=limit)


@router.get("/activity/{action_id}", response_model=ActionResult, tags=["Activity"])
async def get_activity(action_id: str) -> ActionResult:
    """Retrieves a specific action result by its unique ID."""
    act_svc = get_activity_service()
    item = act_svc.get_activity_by_id(action_id)
    if not item:
        raise HTTPException(status_code=404, detail=f"Action '{action_id}' not found.")
    return item
