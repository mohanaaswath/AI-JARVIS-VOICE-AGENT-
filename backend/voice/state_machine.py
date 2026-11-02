"""
voice/state_machine.py — Thread-safe agent lifecycle state machine.

States:
  STANDBY       – Offline wake-word detector is listening.
  ACTIVATING    – Wake word detected; LiveKit session starting.
  ACTIVE        – Live voice conversation in progress.
  DEACTIVATING  – Goodbye phrase heard; tearing down session.
  PAUSED        – Microphone muted; no wake-word detection.
  ERROR         – Unrecoverable failure; manual restart needed.
  SHUTTING_DOWN – Process exit requested.
"""
from __future__ import annotations

import logging
import threading
import time
from enum import Enum
from typing import Callable

logger = logging.getLogger("jarvis.state_machine")


class AgentState(str, Enum):
    STANDBY = "standby"
    ACTIVATING = "activating"
    ACTIVE = "active"
    DEACTIVATING = "deactivating"
    PAUSED = "paused"
    ERROR = "error"
    SHUTTING_DOWN = "shutting_down"


# Valid state transitions (source → allowed targets)
_TRANSITIONS: dict[AgentState, set[AgentState]] = {
    AgentState.STANDBY: {
        AgentState.ACTIVATING,
        AgentState.PAUSED,
        AgentState.SHUTTING_DOWN,
        AgentState.ERROR,
    },
    AgentState.ACTIVATING: {
        AgentState.ACTIVE,
        AgentState.STANDBY,  # activation failed
        AgentState.ERROR,
        AgentState.SHUTTING_DOWN,
    },
    AgentState.ACTIVE: {
        AgentState.DEACTIVATING,
        AgentState.STANDBY,  # connection dropped
        AgentState.ERROR,
        AgentState.SHUTTING_DOWN,
    },
    AgentState.DEACTIVATING: {
        AgentState.STANDBY,
        AgentState.ERROR,
        AgentState.SHUTTING_DOWN,
    },
    AgentState.PAUSED: {
        AgentState.STANDBY,
        AgentState.SHUTTING_DOWN,
        AgentState.ERROR,
    },
    AgentState.ERROR: {
        AgentState.STANDBY,
        AgentState.SHUTTING_DOWN,
    },
    AgentState.SHUTTING_DOWN: set(),  # terminal
}

StateChangeCallback = Callable[[AgentState, AgentState], None]


class StateMachine:
    """Thread-safe finite state machine for the JARVIS agent lifecycle."""

    def __init__(self, initial: AgentState = AgentState.STANDBY) -> None:
        self._state = initial
        self._lock = threading.Lock()
        self._changed = threading.Condition(self._lock)
        self._callbacks: list[StateChangeCallback] = []
        self._entered_at: float = time.time()
        self._history: list[tuple[float, AgentState]] = [(time.time(), initial)]

    # ── Read access ──────────────────────────────────────────────────────────
    @property
    def state(self) -> AgentState:
        with self._lock:
            return self._state

    @property
    def entered_at(self) -> float:
        with self._lock:
            return self._entered_at

    def time_in_state(self) -> float:
        return time.time() - self.entered_at

    def snapshot(self) -> dict:
        with self._lock:
            return {
                "state": self._state.value,
                "entered_at": self._entered_at,
                "seconds_in_state": round(time.time() - self._entered_at, 1),
            }

    # ── Transitions ──────────────────────────────────────────────────────────
    def transition(self, target: AgentState, *, force: bool = False) -> bool:
        """
        Attempt to move to *target*.  Returns True on success.
        If *force* is True the transition table is bypassed (use for ERROR/SHUTTING_DOWN).
        """
        with self._lock:
            current = self._state
            if current == target:
                return True
            allowed = _TRANSITIONS.get(current, set())
            if not force and target not in allowed:
                logger.warning(
                    "Rejected state transition %s → %s", current.value, target.value
                )
                return False
            self._state = target
            self._entered_at = time.time()
            self._history.append((self._entered_at, target))
            if len(self._history) > 50:
                self._history = self._history[-50:]
            self._changed.notify_all()

        logger.info("State: %s → %s", current.value, target.value)
        for cb in list(self._callbacks):
            try:
                cb(current, target)
            except Exception:
                logger.exception("State-change callback raised")
        return True

    def wait_for(
        self,
        *targets: AgentState,
        timeout: float = 30.0,
    ) -> AgentState | None:
        """Block until the state is one of *targets* or timeout elapses."""
        deadline = time.time() + timeout
        with self._lock:
            while self._state not in targets:
                remaining = deadline - time.time()
                if remaining <= 0:
                    return None
                self._changed.wait(timeout=min(remaining, 1.0))
            return self._state

    # ── Convenience helpers ───────────────────────────────────────────────────
    def is_active(self) -> bool:
        return self.state == AgentState.ACTIVE

    def is_standby(self) -> bool:
        return self.state == AgentState.STANDBY

    def can_activate(self) -> bool:
        return self.state == AgentState.STANDBY

    def can_deactivate(self) -> bool:
        return self.state in (AgentState.ACTIVE, AgentState.ACTIVATING)

    def register_callback(self, cb: StateChangeCallback) -> None:
        self._callbacks.append(cb)

    def history(self) -> list[tuple[float, AgentState]]:
        with self._lock:
            return list(self._history)
