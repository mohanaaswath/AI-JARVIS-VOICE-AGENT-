"""
settings_tools.py — Tools for opening official Windows Settings pages.
"""
from livekit.agents.llm import function_tool
from app.services import get_system_service, get_permission_service, get_activity_service


@function_tool
async def open_settings_page(page: str) -> str:
    """
    Open an official Windows Settings page such as bluetooth, sound, display, personalization,
    network, wifi, windowsupdate, power, apps, notifications, storage, or dateandtime.
    Args:
        page: The name of the settings category to open (e.g. 'bluetooth', 'sound', 'wifi', 'display').
    """
    perm_svc = get_permission_service()
    sys_svc = get_system_service()
    act_svc = get_activity_service()

    allowed, reason, _, _ = perm_svc.check_permission("open_settings_page", {"page": page})
    if not allowed:
        return f"Cannot open settings: {reason}"

    res = sys_svc.open_settings_page(page)
    act_svc.record_action(res)
    return res.message
