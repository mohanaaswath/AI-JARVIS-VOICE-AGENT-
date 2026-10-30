"""Dependency-aware offline wake-word adapter.

The adapter never enables the microphone implicitly. A configured model and
explicit user setting are required before audio capture starts.
"""
from __future__ import annotations

import importlib.util
from dataclasses import dataclass


@dataclass(frozen=True)
class WakeWordReadiness:
    available: bool
    reason: str
    wake_word: str = "hey_jarvis"


def readiness() -> WakeWordReadiness:
    if not importlib.util.find_spec("openwakeword"):
        return WakeWordReadiness(False, "openwakeword_not_installed")
    if not importlib.util.find_spec("sounddevice"):
        return WakeWordReadiness(False, "sounddevice_not_installed")
    return WakeWordReadiness(True, "ready")


def detect_once(*, sensitivity: float) -> bool:
    """Reserved for the audio loop; fail explicitly until a model is configured."""
    state = readiness()
    if not state.available:
        raise RuntimeError(f"Wake-word detection unavailable: {state.reason}")
    if not 0.0 <= sensitivity <= 1.0:
        raise ValueError("Wake-word sensitivity must be between 0 and 1.")
    raise RuntimeError("Wake-word model is not configured.")
