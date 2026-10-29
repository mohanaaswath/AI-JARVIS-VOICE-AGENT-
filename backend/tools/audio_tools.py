"""
audio_tools.py — Tools for inspecting audio hardware and setting master volume.
"""
from livekit.agents.llm import function_tool
from app.services import get_system_service, get_permission_service, get_activity_service


@function_tool
async def get_audio_status() -> str:
    """
    Get the current Windows audio status, including master volume level and mute state.
    Use this tool whenever the user asks 'what is my volume', 'is my sound muted', etc.
    """
    sys_svc = get_system_service()
    act_svc = get_activity_service()

    info = sys_svc.get_audio_status()
    if info.master_volume is not None:
        status_text = f"Master volume is currently {info.master_volume}%."
        if info.is_muted:
            status_text += " Audio is currently muted."
        return status_text
    return "Audio status is currently unavailable."


@function_tool
async def set_master_volume(level: int) -> str:
    """
    Set the Windows master audio volume to a specific percentage between 0 and 100.
    Args:
        level: Integer target volume percentage between 0 and 100.
    """
    perm_svc = get_permission_service()
    sys_svc = get_system_service()
    act_svc = get_activity_service()

    allowed, reason, _, _ = perm_svc.check_permission("set_master_volume", {"level": level})
    if not allowed:
        return f"Volume change blocked: {reason}"

    res = sys_svc.set_master_volume(level)
    act_svc.record_action(res)
    return res.message
