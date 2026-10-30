"""Local heartbeat shared by the Windows voice worker and backend API."""
from __future__ import annotations

import json
import os
import time
from pathlib import Path
from typing import Any


def heartbeat_path() -> Path:
    base = os.getenv("LOCALAPPDATA") or os.getenv("TEMP") or "."
    return Path(base) / "Jarvis" / "agent-heartbeat.json"


def read_agent_status(max_age_seconds: int = 15) -> dict[str, Any]:
    path = heartbeat_path()
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return {"available": False, "state": "offline", "reason": "heartbeat_missing"}
    except (OSError, json.JSONDecodeError):
        return {"available": False, "state": "unknown", "reason": "heartbeat_unreadable"}

    timestamp = payload.get("timestamp")
    if not isinstance(timestamp, (int, float)):
        return {"available": False, "state": "unknown", "reason": "heartbeat_invalid"}

    age = max(0.0, time.time() - timestamp)
    available = age <= max_age_seconds and payload.get("state") == "running"
    return {
        "available": available,
        "state": payload.get("state", "unknown") if available else "offline",
        "age_seconds": round(age, 1),
        "agent_name": payload.get("agent_name"),
        "pid": payload.get("pid"),
    }


def write_agent_heartbeat(state: str, agent_name: str, pid: int) -> None:
    path = heartbeat_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(".tmp")
    temporary.write_text(
        json.dumps(
            {
                "state": state,
                "agent_name": agent_name,
                "pid": pid,
                "timestamp": time.time(),
            }
        ),
        encoding="utf-8",
    )
    temporary.replace(path)
