"""
display_tools.py — Tools for inspecting and toggling Windows personalization and dark mode.
"""
from livekit.agents.llm import function_tool
from app.services import get_system_service, get_permission_service, get_activity_service


@function_tool
async def get_display_settings() -> str:
    """
    Get the current Windows display and personalization settings, including dark mode status.
    """
    sys_svc = get_system_service()
    info = sys_svc.get_display_settings()
    if info.dark_mode_enabled is not None:
        mode = "Dark Mode" if info.dark_mode_enabled else "Light Mode"
        return f"Windows is currently using {mode}."
    return "Display personalization information is currently unavailable."


@function_tool
async def set_dark_mode(enabled: bool) -> str:
    """
    Enable or disable Windows Dark Mode for applications and system UI.
    Args:
        enabled: True to enable Dark Mode, False to switch to Light Mode.
    """
    perm_svc = get_permission_service()
    sys_svc = get_system_service()
    act_svc = get_activity_service()

    allowed, reason, _, _ = perm_svc.check_permission("set_dark_mode", {"enabled": enabled})
    if not allowed:
        return f"Display change blocked: {reason}"

    res = sys_svc.set_dark_mode(enabled)
    act_svc.record_action(res)
    return res.message
