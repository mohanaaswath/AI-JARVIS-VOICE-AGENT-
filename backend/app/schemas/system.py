"""
system.py — Pydantic models for system health, audio, display, and hardware metrics.
"""
import time
from pydantic import BaseModel, Field


class CpuInfo(BaseModel):
    percent: float
    logical_cores: int
    physical_cores: int | None = None


class MemoryInfo(BaseModel):
    total_mb: int
    used_mb: int
    available_mb: int
    percent: float


class BatteryInfo(BaseModel):
    available: bool
    percent: float | None = None
    power_plugged: bool | None = None
    secs_left: int | None = None


class AudioInfo(BaseModel):
    master_volume: int | None = None
    is_muted: bool | None = None
    device_name: str | None = None


class DisplayInfo(BaseModel):
    dark_mode_enabled: bool | None = None
    apps_use_light: int | None = None
    system_uses_light: int | None = None


class NetworkInterfaceInfo(BaseModel):
    name: str
    is_up: bool
    speed_mbps: int | None = None


class SystemStatusResponse(BaseModel):
    timestamp: float = Field(default_factory=time.time)
    os_name: str = "Windows"
    os_version: str = ""
    hostname: str = ""
    cpu: CpuInfo
    memory: MemoryInfo
    battery: BatteryInfo
    audio: AudioInfo
    display: DisplayInfo
    network_interfaces: list[NetworkInterfaceInfo] = Field(default_factory=list)
    active_interfaces: list[str] = Field(default_factory=list)
    agent_ready: bool = True
