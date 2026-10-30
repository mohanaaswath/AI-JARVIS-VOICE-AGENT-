"""Persistent local-agent privacy and voice settings."""
from __future__ import annotations

import json
import os
from pathlib import Path
from threading import Lock
from typing import Any


class AgentSettingsService:
    def __init__(self) -> None:
        base = os.getenv("LOCALAPPDATA") or os.getenv("TEMP") or "."
        self.path = Path(base) / "Jarvis" / "agent-settings.json"
        self._lock = Lock()
        self._settings: dict[str, Any] = {
            "wake_word_enabled": False,
            "microphone_muted": False,
            "wake_word_sensitivity": 0.5,
            "conversation_mode": "single",
            "inactivity_timeout_seconds": 30,
        }
        self._load()

    def _load(self) -> None:
        try:
            data = json.loads(self.path.read_text(encoding="utf-8"))
            if isinstance(data, dict):
                self._settings.update(data)
        except (FileNotFoundError, OSError, json.JSONDecodeError):
            return

    def get(self) -> dict[str, Any]:
        with self._lock:
            return dict(self._settings)

    def update(self, values: dict[str, Any]) -> dict[str, Any]:
        with self._lock:
            self._settings.update(values)
            self.path.parent.mkdir(parents=True, exist_ok=True)
            temporary = self.path.with_suffix(".tmp")
            temporary.write_text(json.dumps(self._settings, indent=2), encoding="utf-8")
            temporary.replace(self.path)
            return dict(self._settings)
