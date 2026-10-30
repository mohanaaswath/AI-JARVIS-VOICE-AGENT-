"""Safe browser navigation tools."""
from livekit.agents.llm import function_tool

from app.services import get_activity_service, get_permission_service, get_system_service


@function_tool
async def open_website(website: str) -> str:
    """
    Open a public website in the user's default browser.

    Accepts a supported alias such as YouTube, Google, GitHub, Gmail, or
    Stack Overflow, or a full http(s) URL. It does not submit forms or bypass
    authentication.
    """
    permission = get_permission_service()
    system = get_system_service()
    activity = get_activity_service()

    allowed, reason, _, _ = permission.check_permission("open_website", {"website": website})
    if not allowed:
        return f"Cannot open website: {reason}"

    result = system.open_website(website)
    activity.record_action(result)
    return result.message
