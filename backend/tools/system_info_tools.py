"""
system_info_tools.py — Tools for querying CPU, memory, battery, network, and execution history.
"""
from livekit.agents.llm import function_tool
from app.services import get_system_service, get_activity_service


@function_tool
async def get_system_status() -> str:
    """
    Get a complete summary of the Windows system health, including CPU load,
    RAM usage, battery level, network connection, and current audio volume.
    """
    sys_svc = get_system_service()
    st = sys_svc.get_system_status()

    parts = [
        f"CPU is at {st.cpu.percent:.1f}% across {st.cpu.logical_cores} cores.",
        f"Memory is {st.memory.percent:.1f}% used ({st.memory.used_mb} megabytes of {st.memory.total_mb} megabytes).",
    ]

    if st.battery.available and st.battery.percent is not None:
        charging_str = "plugged in" if st.battery.power_plugged else "on battery"
        parts.append(f"Battery is at {st.battery.percent:.0f}%, {charging_str}.")

    if st.audio.master_volume is not None:
        parts.append(f"Master volume is {st.audio.master_volume}%.")

    if st.display.dark_mode_enabled is not None:
        parts.append(f"System theme is {'Dark Mode' if st.display.dark_mode_enabled else 'Light Mode'}.")

    active_nets = ", ".join(st.active_interfaces) if st.active_interfaces else "none active"
    parts.append(f"Active network: {active_nets}.")

    return " ".join(parts)


@function_tool
async def get_battery_status() -> str:
    """
    Get the laptop's current battery percentage and power charging status.
    """
    sys_svc = get_system_service()
    st = sys_svc.get_system_status()
    if not st.battery.available or st.battery.percent is None:
        return "Battery information is not available on this machine (it may be a desktop or VM)."

    state = "charging" if st.battery.power_plugged else "discharging"
    return f"Battery is at {st.battery.percent:.0f}% and is currently {state}."


@function_tool
async def get_memory_usage() -> str:
    """
    Get current RAM memory utilization in percent and gigabytes.
    """
    sys_svc = get_system_service()
    st = sys_svc.get_system_status()
    used_gb = st.memory.used_mb / 1024.0
    total_gb = st.memory.total_mb / 1024.0
    return f"Memory usage is {st.memory.percent:.1f}%. Using {used_gb:.1f} gigabytes out of {total_gb:.1f} gigabytes total."


@function_tool
async def get_network_status() -> str:
    """
    Get the status of network interfaces and internet connectivity.
    """
    sys_svc = get_system_service()
    st = sys_svc.get_system_status()
    if not st.active_interfaces:
        return "No active network adapters were detected."
    return f"Connected via: {', '.join(st.active_interfaces)}."


@function_tool
async def get_execution_status(action_id: str) -> str:
    """
    Look up the outcome, status, or verification result of a previous operation by its action ID.
    Args:
        action_id: The ID of the action (e.g. 'vol-12345678', 'app-abcdef12').
    """
    act_svc = get_activity_service()
    item = act_svc.get_activity_by_id(action_id)
    if not item:
        return f"No action record found with ID '{action_id}'."

    v_str = f"Verification: {item.verification_status.value}." if item.verification_status else ""
    return f"Action '{item.action_name}' status is {item.status.value}. {item.message} {v_str}"
