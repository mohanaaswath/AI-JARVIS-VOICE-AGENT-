"""
app_tools.py — Tools for launching approved desktop applications.
"""
from livekit.agents.llm import function_tool
from app.services import get_system_service, get_permission_service, get_activity_service


@function_tool
async def open_application(application_name: str) -> str:
    """
    Launch an approved Windows desktop application.
    Supported applications include: Notepad, Calculator, VS Code, Google Chrome, Edge, File Explorer, Terminal, and Jarvis project folder.
    Args:
        application_name: Common name of the application to open (e.g. 'notepad', 'calculator', 'chrome', 'vscode', 'explorer').
    """
    perm_svc = get_permission_service()
    sys_svc = get_system_service()
    act_svc = get_activity_service()

    allowed, reason, _, _ = perm_svc.check_permission("open_application", {"application_name": application_name})
    if not allowed:
        return f"Launch rejected: {reason}"

    res = sys_svc.open_application(application_name)
    act_svc.record_action(res)
    return res.message
