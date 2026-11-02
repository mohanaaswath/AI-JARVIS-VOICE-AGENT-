"""
voice/tray_app.py — Windows system tray icon and menu for JARVIS.

Requires: pip install pystray pillow

The tray runs in its own thread and communicates with the BackgroundAgent
via signal files and the state machine reference.
"""
from __future__ import annotations

import logging
import os
import sys
import threading
import time
import webbrowser
from pathlib import Path
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from voice.background_agent import BackgroundAgent

logger = logging.getLogger("jarvis.tray")

_DASHBOARD_URL = "http://localhost:5173"

# Control paths (same as background_agent.py)
_CONTROL_DIR = Path(os.getenv("LOCALAPPDATA") or os.getenv("TEMP") or ".") / "Jarvis"
_ACTIVATE_PATH = _CONTROL_DIR / "activate.signal"
_DEACTIVATE_PATH = _CONTROL_DIR / "deactivate.signal"


def _make_icon(state: str = "standby"):
    """Create a simple colored circle icon using PIL."""
    try:
        from PIL import Image, ImageDraw  # type: ignore

        size = 64
        img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)

        colors = {
            "standby": "#4ade80",     # green
            "activating": "#facc15",  # yellow
            "active": "#67e8f9",      # cyan
            "deactivating": "#fb923c",  # orange
            "paused": "#94a3b8",      # gray
            "error": "#f87171",       # red
            "shutting_down": "#64748b",  # slate
        }
        color = colors.get(state, "#4ade80")
        draw.ellipse([4, 4, size - 4, size - 4], fill=color)
        return img
    except ImportError:
        logger.warning("pillow not installed — using default tray icon")
        return None


class TrayApp:
    """Manages the Windows system tray icon and context menu."""

    def __init__(self, agent: "BackgroundAgent") -> None:
        self._agent = agent
        self._icon = None
        self._thread: threading.Thread | None = None

    def start(self) -> bool:
        """Start the tray icon in a background thread. Returns False if unavailable."""
        try:
            import pystray  # type: ignore  # noqa: F401
        except ImportError:
            logger.warning(
                "pystray not installed — system tray disabled. "
                "Install with: pip install pystray pillow"
            )
            return False

        self._thread = threading.Thread(
            target=self._run_tray,
            name="jarvis-tray",
            daemon=True,
        )
        self._thread.start()
        return True

    def stop(self) -> None:
        if self._icon:
            try:
                self._icon.stop()
            except Exception:
                pass

    def update_icon(self, state: str) -> None:
        """Update the tray icon to reflect current state."""
        if self._icon is None:
            return
        try:
            img = _make_icon(state)
            if img:
                self._icon.icon = img
            self._icon.title = f"JARVIS — {state.upper()}"
        except Exception as exc:
            logger.debug("Tray icon update error: %s", exc)

    def _run_tray(self) -> None:
        try:
            import pystray  # type: ignore
            from pystray import MenuItem as Item  # type: ignore

            def get_status(_icon, _item):
                pass  # just a label — no action

            def open_dashboard(_icon=None, _item=None):
                webbrowser.open(_DASHBOARD_URL)

            def activate(_icon=None, _item=None):
                _CONTROL_DIR.mkdir(parents=True, exist_ok=True)
                _ACTIVATE_PATH.touch()

            def deactivate(_icon=None, _item=None):
                _CONTROL_DIR.mkdir(parents=True, exist_ok=True)
                _DEACTIVATE_PATH.touch()

            def pause(_icon=None, _item=None):
                self._agent.pause()

            def resume(_icon=None, _item=None):
                self._agent.resume()

            def restart(_icon=None, _item=None):
                self._agent.request_stop()
                time.sleep(1)
                os.execv(sys.executable, [sys.executable] + sys.argv)

            def exit_app(_icon=None, _item=None):
                self._agent.request_stop()
                if self._icon:
                    self._icon.stop()

            def _state_label():
                return f"Status: {self._agent._sm.state.value.upper()}"

            menu = pystray.Menu(
                Item(_state_label, None, enabled=False),
                pystray.Menu.SEPARATOR,
                Item("Open JARVIS Dashboard", open_dashboard),
                Item("Activate JARVIS", activate),
                Item("Deactivate JARVIS", deactivate),
                pystray.Menu.SEPARATOR,
                Item("Pause Listening", pause),
                Item("Resume Listening", resume),
                pystray.Menu.SEPARATOR,
                Item("Restart Agent", restart),
                Item("Exit JARVIS", exit_app),
            )

            img = _make_icon("standby")
            self._icon = pystray.Icon(
                "JARVIS",
                img or _create_fallback_icon(),
                "JARVIS — STANDBY",
                menu,
            )

            # Register state change callback to update tray
            def _on_state_change(old, new):
                self.update_icon(new.value)

            self._agent._sm.register_callback(_on_state_change)

            self._icon.run()
        except Exception as exc:
            logger.error("Tray app error: %s", exc)


def _create_fallback_icon():
    """Minimal 1×1 icon when PIL is unavailable."""
    try:
        from PIL import Image  # type: ignore

        return Image.new("RGB", (16, 16), "#4ade80")
    except ImportError:
        return None
