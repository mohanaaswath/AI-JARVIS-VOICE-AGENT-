"""
system_service.py — Windows system automation, audio control, display personalization,
application launching, and hardware diagnostics service.
"""
import ctypes
from ctypes import wintypes
import logging
import os
from pathlib import Path
import platform
import subprocess
import time
from typing import Any
import uuid
import webbrowser
from urllib.parse import urlparse

import psutil

try:
    import winreg
except ImportError:
    winreg = None  # Non-Windows fallback for unit testing

from app.schemas.actions import ActionResult, ActionStatus, VerificationStatus, RiskLevel
from app.schemas.system import (
    AudioInfo,
    BatteryInfo,
    CpuInfo,
    DisplayInfo,
    MemoryInfo,
    NetworkInterfaceInfo,
    SystemStatusResponse,
)
from app.services.verification_service import VerificationService

logger = logging.getLogger(__name__)

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent


class SystemService:
    # ── Safe Windows Settings Allowlist ───────────────────────────────────────
    SETTINGS_ALLOWLIST: dict[str, str] = {
        "bluetooth": "ms-settings:bluetooth",
        "sound": "ms-settings:sound",
        "audio": "ms-settings:sound",
        "volume": "ms-settings:sound",
        "display": "ms-settings:display",
        "screen": "ms-settings:display",
        "personalization": "ms-settings:personalization",
        "theme": "ms-settings:personalization",
        "themes": "ms-settings:personalization",
        "background": "ms-settings:personalization-background",
        "colors": "ms-settings:personalization-colors",
        "network": "ms-settings:network-status",
        "wifi": "ms-settings:network-wifi",
        "ethernet": "ms-settings:network-ethernet",
        "internet": "ms-settings:network-status",
        "windowsupdate": "ms-settings:windowsupdate",
        "update": "ms-settings:windowsupdate",
        "battery": "ms-settings:powersleep",
        "power": "ms-settings:powersleep",
        "powersleep": "ms-settings:powersleep",
        "apps": "ms-settings:appsfeatures",
        "installed-apps": "ms-settings:appsfeatures",
        "notifications": "ms-settings:notifications",
        "storage": "ms-settings:storagesense",
        "printers": "ms-settings:printers",
        "dateandtime": "ms-settings:dateandtime",
        "time": "ms-settings:dateandtime",
        "privacy": "ms-settings:privacy",
        "default-apps": "ms-settings:defaultapps",
    }

    WEBSITE_ALIASES: dict[str, str] = {
        "youtube": "https://www.youtube.com",
        "google": "https://www.google.com",
        "github": "https://github.com",
        "gmail": "https://mail.google.com",
        "stackoverflow": "https://stackoverflow.com",
    }

    # ── Safe Application Allowlist ───────────────────────────────────────────
    # Uses fixed executable names or direct paths with arguments array (no shell=True)
    APPLICATION_ALLOWLIST: dict[str, list[str]] = {
        "notepad": ["notepad.exe"],
        "calculator": ["calc.exe"],
        "calc": ["calc.exe"],
        "explorer": ["explorer.exe"],
        "files": ["explorer.exe"],
        "code": ["code.cmd"],
        "vscode": ["code.cmd"],
        "vs code": ["code.cmd"],
        "visual studio code": ["code.cmd"],
        "chrome": ["chrome.exe"],
        "google chrome": ["chrome.exe"],
        "edge": ["msedge.exe"],
        "microsoft edge": ["msedge.exe"],
        "cmd": ["cmd.exe"],
        "terminal": ["cmd.exe"],
        "jarvis": ["explorer.exe", str(PROJECT_ROOT)],
        "project": ["explorer.exe", str(PROJECT_ROOT)],
    }

    # ── Permitted File System Roots ──────────────────────────────────────────
    PERMITTED_ROOTS: list[Path] = [
        PROJECT_ROOT.resolve(),
        Path(os.path.expanduser("~/Documents")).resolve(),
        Path(os.path.expanduser("~/Downloads")).resolve(),
        Path(os.path.expanduser("~/Desktop")).resolve(),
    ]

    SENSITIVE_PATTERNS: tuple[str, ...] = (
        ".env",
        "id_rsa",
        "id_ed25519",
        ".ssh",
        "credentials",
        "token",
        "secret",
        "password",
        "AppData\\Local\\Google\\Chrome",
        "AppData\\Roaming\\Mozilla",
    )

    def __init__(self) -> None:
        pass

    # ── System Diagnostics ───────────────────────────────────────────────────
    def get_system_status(self) -> SystemStatusResponse:
        """Collects current hardware, operating system, and network metrics."""
        cpu_percent = psutil.cpu_percent(interval=None)
        cpu_count = psutil.cpu_count(logical=True) or 1
        cpu_phys = psutil.cpu_count(logical=False)

        mem = psutil.virtual_memory()
        mem_info = MemoryInfo(
            total_mb=int(mem.total // (1024 * 1024)),
            used_mb=int(mem.used // (1024 * 1024)),
            available_mb=int(mem.available // (1024 * 1024)),
            percent=float(mem.percent),
        )

        batt = psutil.sensors_battery()
        if batt:
            batt_info = BatteryInfo(
                available=True,
                percent=float(batt.percent),
                power_plugged=bool(batt.power_plugged),
                secs_left=int(batt.secsleft) if batt.secsleft >= 0 else None,
            )
        else:
            batt_info = BatteryInfo(available=False)

        audio_info = self.get_audio_status()
        display_info = self.get_display_settings()

        net_stats = psutil.net_if_stats()
        net_list: list[NetworkInterfaceInfo] = []
        active_list: list[str] = []
        for name, stats in net_stats.items():
            is_up = bool(stats.isup)
            net_list.append(
                NetworkInterfaceInfo(
                    name=name,
                    is_up=is_up,
                    speed_mbps=stats.speed if stats.speed > 0 else None,
                )
            )
            if is_up and not name.lower().startswith("loopback"):
                active_list.append(name)

        return SystemStatusResponse(
            timestamp=time.time(),
            os_name=platform.system(),
            os_version=platform.version(),
            hostname=platform.node(),
            cpu=CpuInfo(
                percent=float(cpu_percent),
                logical_cores=cpu_count,
                physical_cores=cpu_phys,
            ),
            memory=mem_info,
            battery=batt_info,
            audio=audio_info,
            display=display_info,
            network_interfaces=net_list,
            active_interfaces=active_list,
            agent_ready=True,
        )

    # ── Audio Status and Control ─────────────────────────────────────────────
    def get_audio_status(self) -> AudioInfo:
        """Reads master volume and mute state via Windows Multimedia API."""
        try:
            winmm = ctypes.windll.winmm
            vol_dword = wintypes.DWORD()
            res = winmm.waveOutGetVolume(0, ctypes.byref(vol_dword))
            if res == 0:
                raw_left = vol_dword.value & 0xFFFF
                raw_right = (vol_dword.value >> 16) & 0xFFFF
                # Average channels and scale 0-65535 to 0-100%
                avg_raw = (raw_left + raw_right) / 2.0
                volume_pct = int(round((avg_raw / 65535.0) * 100))
                return AudioInfo(
                    master_volume=max(0, min(100, volume_pct)),
                    is_muted=(avg_raw == 0),
                    device_name="Windows Default WaveOut Audio",
                )
        except Exception as exc:
            logger.debug("WinMM audio read error: %s", exc)

        return AudioInfo(master_volume=None, is_muted=None, device_name=None)

    def set_master_volume(self, level: int) -> ActionResult:
        """
        Validates target level (0-100), applies it to master volume,
        reads back observed state, and independently verifies outcome.
        """
        action_id = f"vol-{uuid.uuid4().hex[:8]}"

        if not isinstance(level, (int, float)):
            return ActionResult(
                action_id=action_id,
                action_name="set_master_volume",
                risk_level=RiskLevel.LEVEL_2_LOW_RISK,
                status=ActionStatus.FAILED,
                requested_value=level,
                verification_status=VerificationStatus.FAILED,
                message=f"Invalid volume value: {level}. Target volume must be a number between 0 and 100.",
                error_code="INVALID_ARGUMENT",
            )

        level_int = int(round(level))
        if level_int < 0 or level_int > 100:
            return ActionResult(
                action_id=action_id,
                action_name="set_master_volume",
                risk_level=RiskLevel.LEVEL_2_LOW_RISK,
                status=ActionStatus.FAILED,
                requested_value=level,
                verification_status=VerificationStatus.FAILED,
                message=f"Target volume {level} is out of range. Must be between 0 and 100 percent.",
                error_code="OUT_OF_RANGE",
            )

        try:
            winmm = ctypes.windll.winmm
            # Scale 0-100 to 0-65535
            scaled = int(round((level_int / 100.0) * 65535))
            scaled = max(0, min(65535, scaled))
            vol_param = (scaled << 16) | scaled

            res = winmm.waveOutSetVolume(0, vol_param)
            if res != 0:
                return ActionResult(
                    action_id=action_id,
                    action_name="set_master_volume",
                    risk_level=RiskLevel.LEVEL_2_LOW_RISK,
                    status=ActionStatus.FAILED,
                    requested_value=level_int,
                    observed_value=None,
                    verification_status=VerificationStatus.FAILED,
                    message=f"Windows audio driver returned error code {res}.",
                    error_code="WINMM_ERROR",
                )

            # Read back independently to verify
            time.sleep(0.05)
            status_after = self.get_audio_status()
            observed = status_after.master_volume
            v_status = VerificationService.verify_volume(level_int, observed, tolerance=5)

            success = v_status == VerificationStatus.VERIFIED
            msg = (
                f"Master volume successfully set to {observed}%."
                if success
                else f"Requested volume {level_int}%, but observed volume was {observed}%."
            )

            return ActionResult(
                action_id=action_id,
                action_name="set_master_volume",
                risk_level=RiskLevel.LEVEL_2_LOW_RISK,
                status=ActionStatus.SUCCESS if success else ActionStatus.FAILED,
                requested_value=level_int,
                observed_value=observed,
                verification_status=v_status,
                message=msg,
                parameters={"level": level_int},
            )
        except Exception as exc:
            logger.error("Set volume failed: %s", exc)
            return ActionResult(
                action_id=action_id,
                action_name="set_master_volume",
                risk_level=RiskLevel.LEVEL_2_LOW_RISK,
                status=ActionStatus.FAILED,
                requested_value=level_int,
                observed_value=None,
                verification_status=VerificationStatus.FAILED,
                message=f"Failed to set master volume: {exc}",
                error_code="EXCEPTION",
            )

    # ── Display and Personalization Control ──────────────────────────────────
    def get_display_settings(self) -> DisplayInfo:
        """Reads current Windows Dark/Light mode registry configuration."""
        if not winreg:
            return DisplayInfo()

        key_path = r"Software\Microsoft\Windows\CurrentVersion\Themes\Personalize"
        try:
            with winreg.OpenKey(winreg.HKEY_CURRENT_USER, key_path, 0, winreg.KEY_READ) as key:
                apps_light, _ = winreg.QueryValueEx(key, "AppsUseLightTheme")
                sys_light, _ = winreg.QueryValueEx(key, "SystemUsesLightTheme")
                return DisplayInfo(
                    dark_mode_enabled=(apps_light == 0),
                    apps_use_light=int(apps_light),
                    system_uses_light=int(sys_light),
                )
        except Exception as exc:
            logger.debug("Failed to read personalization registry: %s", exc)
            return DisplayInfo()

    def set_dark_mode(self, enabled: bool) -> ActionResult:
        """
        Enables or disables Windows Dark Mode by updating the official Personalize registry keys
        and broadcasting WM_SETTINGCHANGE to notify running desktop applications.
        """
        action_id = f"disp-{uuid.uuid4().hex[:8]}"

        if not winreg:
            return ActionResult(
                action_id=action_id,
                action_name="set_dark_mode",
                risk_level=RiskLevel.LEVEL_2_LOW_RISK,
                status=ActionStatus.FAILED,
                requested_value=enabled,
                verification_status=VerificationStatus.FAILED,
                message="Windows registry API is not available on this platform.",
                error_code="PLATFORM_UNSUPPORTED",
            )

        key_path = r"Software\Microsoft\Windows\CurrentVersion\Themes\Personalize"
        target_val = 0 if enabled else 1  # 0 = Dark Mode, 1 = Light Mode

        try:
            with winreg.OpenKey(winreg.HKEY_CURRENT_USER, key_path, 0, winreg.KEY_SET_VALUE) as key:
                winreg.SetValueEx(key, "AppsUseLightTheme", 0, winreg.REG_DWORD, target_val)
                winreg.SetValueEx(key, "SystemUsesLightTheme", 0, winreg.REG_DWORD, target_val)

            # Broadcast WM_SETTINGCHANGE (0x001A) so open windows update without requiring a logout
            try:
                HWND_BROADCAST = 0xFFFF
                WM_SETTINGCHANGE = 0x001A
                SMTO_ABORTIFHUNG = 0x0002
                result_ptr = wintypes.DWORD()
                ctypes.windll.user32.SendMessageTimeoutW(
                    HWND_BROADCAST,
                    WM_SETTINGCHANGE,
                    0,
                    "ImmersiveColorSet",
                    SMTO_ABORTIFHUNG,
                    100,
                    ctypes.byref(result_ptr),
                )
            except Exception as broadcast_exc:
                logger.debug("WM_SETTINGCHANGE broadcast: %s", broadcast_exc)

            time.sleep(0.05)
            status_after = self.get_display_settings()
            v_status = VerificationService.verify_dark_mode(
                enabled, status_after.apps_use_light, status_after.system_uses_light
            )
            mode_name = "Dark" if enabled else "Light"

            return ActionResult(
                action_id=action_id,
                action_name="set_dark_mode",
                risk_level=RiskLevel.LEVEL_2_LOW_RISK,
                status=ActionStatus.SUCCESS if v_status == VerificationStatus.VERIFIED else ActionStatus.FAILED,
                requested_value=enabled,
                observed_value=status_after.dark_mode_enabled,
                verification_status=v_status,
                message=f"Windows {mode_name} Mode applied and verified.",
                parameters={"enabled": enabled},
            )
        except PermissionError:
            return ActionResult(
                action_id=action_id,
                action_name="set_dark_mode",
                risk_level=RiskLevel.LEVEL_2_LOW_RISK,
                status=ActionStatus.FAILED,
                requested_value=enabled,
                verification_status=VerificationStatus.FAILED,
                message="Access denied: Unable to modify Windows personalization registry keys.",
                error_code="ACCESS_DENIED",
            )
        except Exception as exc:
            return ActionResult(
                action_id=action_id,
                action_name="set_dark_mode",
                risk_level=RiskLevel.LEVEL_2_LOW_RISK,
                status=ActionStatus.FAILED,
                requested_value=enabled,
                verification_status=VerificationStatus.FAILED,
                message=f"Failed to change personalization mode: {exc}",
                error_code="EXCEPTION",
            )

    # ── Windows Settings Page Launching ──────────────────────────────────────
    def open_settings_page(self, page_name: str) -> ActionResult:
        """
        Validates page_name against an explicit allowlist and opens the official ms-settings URI.
        """
        action_id = f"set-{uuid.uuid4().hex[:8]}"
        normalized = (page_name or "").strip().lower()

        if normalized not in self.SETTINGS_ALLOWLIST:
            valid_pages = ", ".join(sorted(self.SETTINGS_ALLOWLIST.keys())[:10]) + "..."
            return ActionResult(
                action_id=action_id,
                action_name="open_settings_page",
                risk_level=RiskLevel.LEVEL_2_LOW_RISK,
                status=ActionStatus.FAILED,
                requested_value=page_name,
                verification_status=VerificationStatus.FAILED,
                message=f"Settings page '{page_name}' is not in the approved allowlist. Approved examples: {valid_pages}",
                error_code="UNSUPPORTED_SETTINGS_PAGE",
            )

        uri = self.SETTINGS_ALLOWLIST[normalized]

        try:
            # Use os.startfile for Windows ms-settings protocol without invoking shell
            if hasattr(os, "startfile"):
                os.startfile(uri)
            else:
                subprocess.Popen(["explorer.exe", uri], shell=False)

            return ActionResult(
                action_id=action_id,
                action_name="open_settings_page",
                risk_level=RiskLevel.LEVEL_2_LOW_RISK,
                status=ActionStatus.SUCCESS,
                requested_value=page_name,
                observed_value=uri,
                verification_status=VerificationStatus.VERIFIED,
                message=f"Opened Windows {normalized.capitalize()} Settings ({uri}).",
                parameters={"page": page_name, "uri": uri},
            )
        except Exception as exc:
            logger.error("Failed to open settings URI %s: %s", uri, exc)
            return ActionResult(
                action_id=action_id,
                action_name="open_settings_page",
                risk_level=RiskLevel.LEVEL_2_LOW_RISK,
                status=ActionStatus.FAILED,
                requested_value=page_name,
                observed_value=None,
                verification_status=VerificationStatus.FAILED,
                message=f"Failed to open settings page '{page_name}': {exc}",
                error_code="LAUNCH_ERROR",
            )

    # ── Application Launching ────────────────────────────────────────────────
    def open_application(self, app_name: str) -> ActionResult:
        """
        Launches an approved application using parameter arrays without shell=True.
        Detects launch failures and verifies process creation.
        """
        action_id = f"app-{uuid.uuid4().hex[:8]}"
        normalized = (app_name or "").strip().lower()

        if normalized not in self.APPLICATION_ALLOWLIST:
            valid_apps = ", ".join(sorted(self.APPLICATION_ALLOWLIST.keys()))
            return ActionResult(
                action_id=action_id,
                action_name="open_application",
                risk_level=RiskLevel.LEVEL_2_LOW_RISK,
                status=ActionStatus.FAILED,
                requested_value=app_name,
                verification_status=VerificationStatus.FAILED,
                message=f"Application '{app_name}' is not in the approved application allowlist. Supported applications: {valid_apps}",
                error_code="APP_NOT_ALLOWLISTED",
            )

        cmd = self.APPLICATION_ALLOWLIST[normalized]

        try:
            # For .cmd scripts on Windows (e.g. code.cmd), cmd.exe /c is needed without shell=True
            if cmd[0].endswith(".cmd") or cmd[0].endswith(".bat"):
                proc = subprocess.Popen(["cmd.exe", "/c"] + cmd, shell=False)
            else:
                proc = subprocess.Popen(cmd, shell=False)

            time.sleep(0.2)
            v_status = VerificationService.verify_application_spawned(
                process_name=cmd[0],
                launched_pid=proc.pid if proc else None,
            )

            return ActionResult(
                action_id=action_id,
                action_name="open_application",
                risk_level=RiskLevel.LEVEL_2_LOW_RISK,
                status=ActionStatus.SUCCESS,
                requested_value=app_name,
                observed_value=f"PID {proc.pid}" if proc else "Launched",
                verification_status=v_status,
                message=f"Application '{app_name}' launched successfully.",
                parameters={"application_name": app_name, "command": cmd},
            )
        except FileNotFoundError:
            return ActionResult(
                action_id=action_id,
                action_name="open_application",
                risk_level=RiskLevel.LEVEL_2_LOW_RISK,
                status=ActionStatus.FAILED,
                requested_value=app_name,
                observed_value=None,
                verification_status=VerificationStatus.FAILED,
                message=f"Application executable '{cmd[0]}' was not found on this computer.",
                error_code="EXECUTABLE_NOT_FOUND",
            )
        except Exception as exc:
            return ActionResult(
                action_id=action_id,
                action_name="open_application",
                risk_level=RiskLevel.LEVEL_2_LOW_RISK,
                status=ActionStatus.FAILED,
                requested_value=app_name,
                observed_value=None,
                verification_status=VerificationStatus.FAILED,
                message=f"Failed to launch application '{app_name}': {exc}",
                error_code="LAUNCH_EXCEPTION",
            )

    def open_website(self, target: str) -> ActionResult:
        """Open a validated public HTTP(S) URL in the user's default browser."""
        action_id = f"web-{uuid.uuid4().hex[:8]}"
        normalized = (target or "").strip().lower()
        url = self.WEBSITE_ALIASES.get(normalized, target.strip() if target else "")
        parsed = urlparse(url)

        if (
            parsed.scheme not in {"http", "https"}
            or not parsed.netloc
            or parsed.username
            or parsed.password
        ):
            return ActionResult(
                action_id=action_id,
                action_name="open_website",
                risk_level=RiskLevel.LEVEL_1_READONLY,
                status=ActionStatus.FAILED,
                requested_value=target,
                verification_status=VerificationStatus.FAILED,
                message="Only valid public HTTP or HTTPS website URLs are allowed.",
                error_code="INVALID_WEBSITE_URL",
            )

        try:
            opened = webbrowser.open_new_tab(url)
            if not opened:
                return ActionResult(
                    action_id=action_id,
                    action_name="open_website",
                    risk_level=RiskLevel.LEVEL_1_READONLY,
                    status=ActionStatus.FAILED,
                    requested_value=target,
                    verification_status=VerificationStatus.UNVERIFIED,
                    message=f"The browser could not open '{url}'.",
                    error_code="BROWSER_OPEN_FAILED",
                )
            return ActionResult(
                action_id=action_id,
                action_name="open_website",
                risk_level=RiskLevel.LEVEL_1_READONLY,
                status=ActionStatus.SUCCESS,
                requested_value=target,
                observed_value=url,
                verification_status=VerificationStatus.UNVERIFIED,
                message=f"Opened {url} in the default browser.",
                parameters={"url": url},
            )
        except OSError as exc:
            return ActionResult(
                action_id=action_id,
                action_name="open_website",
                risk_level=RiskLevel.LEVEL_1_READONLY,
                status=ActionStatus.FAILED,
                requested_value=target,
                verification_status=VerificationStatus.FAILED,
                message=f"Failed to open '{url}': {exc}",
                error_code="BROWSER_OPEN_ERROR",
            )

    # ── Permitted File and Folder Operations ──────────────────────────────────
    def _is_path_permitted(self, path: Path) -> tuple[bool, str]:
        resolved = path.resolve()
        # Check against permitted roots
        in_root = any(
            str(resolved).lower().startswith(str(root).lower())
            for root in self.PERMITTED_ROOTS
        )
        if not in_root:
            return False, f"Access denied: Path '{path}' is outside permitted directories."

        # Check for sensitive patterns
        str_path = str(resolved).lower()
        for pat in self.SENSITIVE_PATTERNS:
            if pat.lower() in str_path:
                return False, f"Access denied: '{pat}' is a restricted file or sensitive path."

        return True, ""

    def list_allowed_files(self, folder_path: str = "") -> ActionResult:
        action_id = f"file-{uuid.uuid4().hex[:8]}"
        target = Path(folder_path) if folder_path else PROJECT_ROOT
        ok, reason = self._is_path_permitted(target)
        if not ok:
            return ActionResult(
                action_id=action_id,
                action_name="list_allowed_files",
                risk_level=RiskLevel.LEVEL_1_READONLY,
                status=ActionStatus.FAILED,
                requested_value=folder_path,
                verification_status=VerificationStatus.FAILED,
                message=reason,
                error_code="PATH_FORBIDDEN",
            )

        if not target.exists() or not target.is_dir():
            return ActionResult(
                action_id=action_id,
                action_name="list_allowed_files",
                risk_level=RiskLevel.LEVEL_1_READONLY,
                status=ActionStatus.FAILED,
                requested_value=folder_path,
                verification_status=VerificationStatus.FAILED,
                message=f"Folder '{folder_path}' does not exist or is not a directory.",
                error_code="DIRECTORY_NOT_FOUND",
            )

        try:
            items = []
            for item in target.iterdir():
                if item.name.startswith(".") and item.name != ".env.example":
                    continue
                items.append({
                    "name": item.name,
                    "is_dir": item.is_dir(),
                    "size_bytes": item.stat().st_size if item.is_file() else None,
                })
            return ActionResult(
                action_id=action_id,
                action_name="list_allowed_files",
                risk_level=RiskLevel.LEVEL_1_READONLY,
                status=ActionStatus.SUCCESS,
                requested_value=str(target),
                observed_value=len(items),
                verification_status=VerificationStatus.VERIFIED,
                message=f"Listed {len(items)} items in '{target.name}'.",
                parameters={"items": items[:30]},
            )
        except Exception as exc:
            return ActionResult(
                action_id=action_id,
                action_name="list_allowed_files",
                risk_level=RiskLevel.LEVEL_1_READONLY,
                status=ActionStatus.FAILED,
                requested_value=folder_path,
                verification_status=VerificationStatus.FAILED,
                message=f"Error listing folder: {exc}",
                error_code="READ_ERROR",
            )

    def read_allowed_file(self, file_path: str) -> ActionResult:
        action_id = f"file-{uuid.uuid4().hex[:8]}"
        target = Path(file_path)
        if not target.is_absolute():
            target = PROJECT_ROOT / target

        ok, reason = self._is_path_permitted(target)
        if not ok:
            return ActionResult(
                action_id=action_id,
                action_name="read_allowed_file",
                risk_level=RiskLevel.LEVEL_1_READONLY,
                status=ActionStatus.FAILED,
                requested_value=file_path,
                verification_status=VerificationStatus.FAILED,
                message=reason,
                error_code="PATH_FORBIDDEN",
            )

        if not target.exists() or not target.is_file():
            return ActionResult(
                action_id=action_id,
                action_name="read_allowed_file",
                risk_level=RiskLevel.LEVEL_1_READONLY,
                status=ActionStatus.FAILED,
                requested_value=file_path,
                verification_status=VerificationStatus.FAILED,
                message=f"File '{file_path}' does not exist.",
                error_code="FILE_NOT_FOUND",
            )

        try:
            # Guard maximum read size (500 KB)
            if target.stat().st_size > 500 * 1024:
                return ActionResult(
                    action_id=action_id,
                    action_name="read_allowed_file",
                    risk_level=RiskLevel.LEVEL_1_READONLY,
                    status=ActionStatus.FAILED,
                    requested_value=file_path,
                    verification_status=VerificationStatus.FAILED,
                    message="File exceeds 500 KB limit for voice assistant reading.",
                    error_code="FILE_TOO_LARGE",
                )

            content = target.read_text(encoding="utf-8", errors="replace")
            # Truncate content for voice output
            truncated = content[:2000] if len(content) > 2000 else content
            return ActionResult(
                action_id=action_id,
                action_name="read_allowed_file",
                risk_level=RiskLevel.LEVEL_1_READONLY,
                status=ActionStatus.SUCCESS,
                requested_value=file_path,
                observed_value=len(content),
                verification_status=VerificationStatus.VERIFIED,
                message=f"Read {len(content)} characters from '{target.name}'.",
                parameters={"content": truncated, "total_length": len(content)},
            )
        except Exception as exc:
            return ActionResult(
                action_id=action_id,
                action_name="read_allowed_file",
                risk_level=RiskLevel.LEVEL_1_READONLY,
                status=ActionStatus.FAILED,
                requested_value=file_path,
                verification_status=VerificationStatus.FAILED,
                message=f"Error reading file '{file_path}': {exc}",
                error_code="FILE_READ_ERROR",
            )

    def open_allowed_folder(self, folder_name: str) -> ActionResult:
        action_id = f"dir-{uuid.uuid4().hex[:8]}"
        norm = (folder_name or "").strip().lower()

        target_map = {
            "project": PROJECT_ROOT,
            "jarvis": PROJECT_ROOT,
            "downloads": Path(os.path.expanduser("~/Downloads")),
            "documents": Path(os.path.expanduser("~/Documents")),
            "desktop": Path(os.path.expanduser("~/Desktop")),
        }

        target = target_map.get(norm)
        if not target:
            target = PROJECT_ROOT / folder_name

        ok, reason = self._is_path_permitted(target)
        if not ok:
            return ActionResult(
                action_id=action_id,
                action_name="open_allowed_folder",
                risk_level=RiskLevel.LEVEL_2_LOW_RISK,
                status=ActionStatus.FAILED,
                requested_value=folder_name,
                verification_status=VerificationStatus.FAILED,
                message=reason,
                error_code="PATH_FORBIDDEN",
            )

        if not target.exists() or not target.is_dir():
            return ActionResult(
                action_id=action_id,
                action_name="open_allowed_folder",
                risk_level=RiskLevel.LEVEL_2_LOW_RISK,
                status=ActionStatus.FAILED,
                requested_value=folder_name,
                verification_status=VerificationStatus.FAILED,
                message=f"Folder '{folder_name}' does not exist.",
                error_code="FOLDER_NOT_FOUND",
            )

        try:
            subprocess.Popen(["explorer.exe", str(target.resolve())], shell=False)
            return ActionResult(
                action_id=action_id,
                action_name="open_allowed_folder",
                risk_level=RiskLevel.LEVEL_2_LOW_RISK,
                status=ActionStatus.SUCCESS,
                requested_value=folder_name,
                observed_value=str(target),
                verification_status=VerificationStatus.VERIFIED,
                message=f"Opened folder '{target.name}' in File Explorer.",
                parameters={"folder_path": str(target)},
            )
        except Exception as exc:
            return ActionResult(
                action_id=action_id,
                action_name="open_allowed_folder",
                risk_level=RiskLevel.LEVEL_2_LOW_RISK,
                status=ActionStatus.FAILED,
                requested_value=folder_name,
                verification_status=VerificationStatus.FAILED,
                message=f"Failed to open folder: {exc}",
                error_code="EXPLORER_ERROR",
            )
