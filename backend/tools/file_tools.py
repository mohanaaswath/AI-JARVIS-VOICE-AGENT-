"""
file_tools.py — Tools for inspecting approved files and folders within safe directory boundaries.
"""
from livekit.agents.llm import function_tool
from app.services import get_system_service, get_permission_service, get_activity_service


@function_tool
async def list_allowed_files(folder_path: str = "") -> str:
    """
    List files and folders inside an approved directory (e.g. project directory, Documents, Downloads).
    Args:
        folder_path: Relative path within the project, or empty for project root.
    """
    perm_svc = get_permission_service()
    sys_svc = get_system_service()
    act_svc = get_activity_service()

    allowed, reason, _, _ = perm_svc.check_permission("list_allowed_files", {"folder_path": folder_path})
    if not allowed:
        return f"Access denied: {reason}"

    res = sys_svc.list_allowed_files(folder_path)
    act_svc.record_action(res)

    if res.status.value == "success" and "items" in res.parameters:
        names = [item["name"] + ("/" if item["is_dir"] else "") for item in res.parameters["items"]]
        display = ", ".join(names[:15])
        suffix = f" (and {len(names) - 15} more)" if len(names) > 15 else ""
        return f"Found {res.observed_value} items: {display}{suffix}."
    return res.message


@function_tool
async def read_allowed_file(file_path: str) -> str:
    """
    Read the text content of a safe, permitted file (e.g. README.md, code files in the project).
    Sensitive files such as .env, passwords, and private keys are strictly blocked.
    Args:
        file_path: Relative or absolute path to the permitted text file.
    """
    perm_svc = get_permission_service()
    sys_svc = get_system_service()
    act_svc = get_activity_service()

    allowed, reason, _, _ = perm_svc.check_permission("read_allowed_file", {"file_path": file_path})
    if not allowed:
        return f"Access denied: {reason}"

    res = sys_svc.read_allowed_file(file_path)
    act_svc.record_action(res)

    if res.status.value == "success" and "content" in res.parameters:
        return f"File content:\n{res.parameters['content']}"
    return res.message


@function_tool
async def open_allowed_folder(folder_name: str) -> str:
    """
    Open an approved folder in Windows File Explorer (e.g. 'project', 'downloads', 'documents', 'desktop').
    Args:
        folder_name: Name of the folder to open ('project', 'downloads', 'documents', or 'desktop').
    """
    perm_svc = get_permission_service()
    sys_svc = get_system_service()
    act_svc = get_activity_service()

    allowed, reason, _, _ = perm_svc.check_permission("open_allowed_folder", {"folder_name": folder_name})
    if not allowed:
        return f"Access denied: {reason}"

    res = sys_svc.open_allowed_folder(folder_name)
    act_svc.record_action(res)
    return res.message
