"""
tools package — Exports all function tools registered on the JARVIS assistant.
"""
from tools.audio_tools import get_audio_status, set_master_volume
from tools.display_tools import get_display_settings, set_dark_mode
from tools.settings_tools import open_settings_page
from tools.browser_tools import open_website
from tools.app_tools import open_application
from tools.file_tools import list_allowed_files, read_allowed_file, open_allowed_folder
from tools.file_management_tools import search_allowed_files, create_allowed_folder, create_allowed_file
from tools.system_info_tools import (
    get_system_status,
    get_battery_status,
    get_memory_usage,
    get_network_status,
    get_execution_status,
)

ALL_JARVIS_TOOLS = [
    # System info & diagnostics
    get_system_status,
    get_battery_status,
    get_memory_usage,
    get_network_status,
    get_execution_status,

    # Audio control
    get_audio_status,
    set_master_volume,

    # Display & Personalization
    get_display_settings,
    set_dark_mode,

    # Windows Settings navigation
    open_settings_page,
    open_website,

    # Applications
    open_application,

    # Permitted file operations
    list_allowed_files,
    read_allowed_file,
    open_allowed_folder,
    search_allowed_files,
    create_allowed_folder,
    create_allowed_file,
]

__all__ = [
    "ALL_JARVIS_TOOLS",
    "get_audio_status",
    "set_master_volume",
    "get_display_settings",
    "set_dark_mode",
    "open_settings_page",
    "open_website",
    "open_application",
    "list_allowed_files",
    "read_allowed_file",
    "open_allowed_folder",
    "search_allowed_files",
    "create_allowed_folder",
    "create_allowed_file",
    "get_system_status",
    "get_battery_status",
    "get_memory_usage",
    "get_network_status",
    "get_execution_status",
]
