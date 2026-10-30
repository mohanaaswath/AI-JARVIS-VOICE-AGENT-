"""
api/system.py — FastAPI endpoints for Windows system status, audio, and action execution.
"""
import logging
from fastapi import APIRouter, HTTPException
from app.schemas.system import SystemStatusResponse, AudioInfo
from app.schemas.actions import ActionResult, ExecuteActionRequest, ActionStatus, VerificationStatus
from app.services import get_system_service, get_permission_service, get_activity_service

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/system/status", response_model=SystemStatusResponse, tags=["System"])
async def get_system_status_endpoint() -> SystemStatusResponse:
    """Returns real-time Windows hardware, battery, memory, audio, and display telemetry."""
    svc = get_system_service()
    return svc.get_system_status()


@router.get("/system/audio", response_model=AudioInfo, tags=["System"])
async def get_audio_status_endpoint() -> AudioInfo:
    """Returns current Windows master audio volume and mute state."""
    svc = get_system_service()
    return svc.get_audio_status()


@router.post("/system/actions", response_model=ActionResult, tags=["System"])
async def execute_action_endpoint(req: ExecuteActionRequest) -> ActionResult:
    """
    Executes an approved Windows action through the unified permission and verification engine.
    """
    perm_svc = get_permission_service()
    sys_svc = get_system_service()
    act_svc = get_activity_service()

    allowed, reason, risk_level, pending_req = perm_svc.check_permission(
        action_name=req.action_name,
        parameters=req.parameters,
        approval_id=req.approval_id,
    )

    if not allowed:
        res = ActionResult(
            action_id=pending_req.approval_id if pending_req else f"rej-{req.action_name}",
            action_name=req.action_name,
            risk_level=risk_level.value,
            status=ActionStatus.PENDING if pending_req else ActionStatus.REJECTED,
            requested_value=req.parameters,
            verification_status=VerificationStatus.NOT_APPLICABLE,
            message=reason,
            error_code="APPROVAL_REQUIRED" if pending_req else "PERMISSION_DENIED",
            parameters=req.parameters,
        )
        act_svc.record_action(res)
        return res

    # Action dispatch
    if req.action_name == "set_master_volume":
        level = req.parameters.get("level")
        if level is None:
            raise HTTPException(status_code=400, detail="Missing parameter: 'level'")
        res = sys_svc.set_master_volume(level)

    elif req.action_name == "set_dark_mode":
        enabled = req.parameters.get("enabled")
        if enabled is None:
            raise HTTPException(status_code=400, detail="Missing parameter: 'enabled'")
        res = sys_svc.set_dark_mode(enabled)

    elif req.action_name == "open_settings_page":
        page = req.parameters.get("page")
        if not page:
            raise HTTPException(status_code=400, detail="Missing parameter: 'page'")
        res = sys_svc.open_settings_page(page)

    elif req.action_name == "open_application":
        app_name = req.parameters.get("application_name")
        if not app_name:
            raise HTTPException(status_code=400, detail="Missing parameter: 'application_name'")
        res = sys_svc.open_application(app_name)

    elif req.action_name == "open_allowed_folder":
        folder = req.parameters.get("folder_name", "")
        res = sys_svc.open_allowed_folder(folder)

    elif req.action_name == "list_allowed_files":
        folder = req.parameters.get("folder_path", "")
        res = sys_svc.list_allowed_files(folder)

    elif req.action_name == "read_allowed_file":
        file_path = req.parameters.get("file_path", "")
        if not file_path:
            raise HTTPException(status_code=400, detail="Missing parameter: 'file_path'")
        res = sys_svc.read_allowed_file(file_path)

    elif req.action_name == "open_website":
        website = req.parameters.get("website")
        if not website:
            raise HTTPException(status_code=400, detail="Missing parameter: 'website'")
        res = sys_svc.open_website(website)

    elif req.action_name == "search_allowed_files":
        query = req.parameters.get("query")
        if not query:
            raise HTTPException(status_code=400, detail="Missing parameter: 'query'")
        res = sys_svc.search_allowed_files(query, req.parameters.get("extension", ""))

    elif req.action_name == "create_allowed_folder":
        folder_path = req.parameters.get("folder_path")
        if not folder_path:
            raise HTTPException(status_code=400, detail="Missing parameter: 'folder_path'")
        res = sys_svc.create_allowed_folder(folder_path)

    elif req.action_name == "create_allowed_file":
        file_path = req.parameters.get("file_path")
        if not file_path:
            raise HTTPException(status_code=400, detail="Missing parameter: 'file_path'")
        res = sys_svc.create_allowed_file(file_path)

    else:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown or unsupported action name: '{req.action_name}'"
        )

    act_svc.record_action(res)
    return res
