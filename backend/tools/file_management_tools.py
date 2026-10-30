"""Validated file-management tools requiring explicit approval."""
from livekit.agents.llm import function_tool

from app.services import get_activity_service, get_permission_service, get_system_service


async def _run(action: str, parameters: dict) -> str:
    permission = get_permission_service()
    system = get_system_service()
    activity = get_activity_service()
    allowed, reason, _, _ = permission.check_permission(action, parameters)
    if not allowed:
        return f"Approval required: {reason}"
    result = getattr(system, action)(**parameters)
    activity.record_action(result)
    return result.message


@function_tool
async def search_allowed_files(query: str, extension: str = "") -> str:
    """Search permitted Windows roots by filename and optional extension."""
    return await _run("search_allowed_files", {"query": query, "extension": extension})


@function_tool
async def create_allowed_folder(folder_path: str) -> str:
    """Create a folder inside a permitted root after approval."""
    return await _run("create_allowed_folder", {"folder_path": folder_path})


@function_tool
async def create_allowed_file(file_path: str) -> str:
    """Create an empty file inside a permitted root after approval."""
    return await _run("create_allowed_file", {"file_path": file_path})
