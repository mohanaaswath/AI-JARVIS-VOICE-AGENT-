"""
voice/background_agent.py — JARVIS Windows Background Voice Agent.

This is the main entry point for the persistent background process.
It replaces/supersedes local_agent.py with a proper state machine.

Lifecycle:
  STANDBY      → wake word detected
  ACTIVATING   → LiveKit worker starting
  ACTIVE       → voice session running
  DEACTIVATING → "bye jarvis" heard / manual stop
  STANDBY      → (loop repeats)

Single-instance enforcement is done via a file lock (msvcrt on Windows).
Heartbeat is written every 5 s so the FastAPI /api/agent/status can report state.

Run as:
    python -m voice.background_agent
or:
    python backend/voice/background_agent.py
"""
from __future__ import annotations

import argparse
import atexit
import logging
import os
import signal
import sys
import threading
import time
from pathlib import Path

# ── Path setup ────────────────────────────────────────────────────────────────
_HERE = Path(__file__).resolve().parent          # backend/voice/
_BACKEND = _HERE.parent                          # backend/
_PROJECT_ROOT = _BACKEND.parent                  # JARVISE/

if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))

from dotenv import load_dotenv  # noqa: E402

load_dotenv(_PROJECT_ROOT / ".env")
load_dotenv(_PROJECT_ROOT / "frontend" / ".env", override=True)

from voice.state_machine import AgentState, StateMachine  # noqa: E402
from voice.wake_word_detector import WakeWordDetector  # noqa: E402
from voice.session_manager import SessionManager, STOP_PATH, CONTROL_DIR  # noqa: E402
from app.services.agent_status_service import write_agent_heartbeat  # noqa: E402
from voice.tray_app import TrayApp  # noqa: E402

_PAUSE_SIGNAL = CONTROL_DIR / "pause.signal"
_RESUME_SIGNAL = CONTROL_DIR / "resume.signal"

logger = logging.getLogger("jarvis.background_agent")

# ── Control paths ─────────────────────────────────────────────────────────────
LOCK_PATH = CONTROL_DIR / "background_agent.lock"
ACTIVATE_PATH = CONTROL_DIR / "activate.signal"   # touch to request activation
DEACTIVATE_PATH = CONTROL_DIR / "deactivate.signal"  # touch to request deactivation

# ── Single-instance guard ─────────────────────────────────────────────────────
try:
    import msvcrt  # Windows only
    _HAS_MSVCRT = True
except ImportError:
    _HAS_MSVCRT = False


class SingleInstance:
    def __init__(self, path: Path) -> None:
        self.path = path
        self._handle = None

    def acquire(self) -> bool:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._handle = self.path.open("a+")
        if not _HAS_MSVCRT:
            return True
        try:
            self._handle.seek(0)
            msvcrt.locking(self._handle.fileno(), msvcrt.LK_NBLCK, 1)  # type: ignore[attr-defined]
            return True
        except OSError:
            self._handle.close()
            self._handle = None
            return False

    def release(self) -> None:
        if self._handle is None:
            return
        if _HAS_MSVCRT:
            try:
                self._handle.seek(0)
                msvcrt.locking(self._handle.fileno(), msvcrt.LK_UNLCK, 1)  # type: ignore[attr-defined]
            except OSError:
                pass
        self._handle.close()
        self._handle = None


# ── Background Agent ──────────────────────────────────────────────────────────
class BackgroundAgent:
    """
    Orchestrates the wake-word detector, state machine, and LiveKit session.
    """

    def __init__(
        self,
        restart_delay: float = 5.0,
        inactivity_timeout: float = 300.0,
    ) -> None:
        self._sm = StateMachine(AgentState.STANDBY)
        self._sm.register_callback(self._on_state_change)

        self._wwd = WakeWordDetector(sensitivity=0.5)
        self._wwd.register_callback(self._on_wake_word)

        self._session = SessionManager(backend_dir=_BACKEND)
        self._session.register_exit_callback(self._on_worker_exit)
        self._tray = TrayApp(self)

        self._restart_delay = restart_delay
        self._inactivity_timeout = inactivity_timeout
        self._stopping = False
        self._stop_event = threading.Event()
        self._agent_name = os.getenv("LIVEKIT_AGENT_NAME", "my-agent")

        # Heartbeat thread
        self._heartbeat_stop = threading.Event()
        self._heartbeat_thread: threading.Thread | None = None

    # ── Lifecycle ─────────────────────────────────────────────────────────────
    def run(self) -> int:
        """Main entry point.  Blocks until shutdown is requested."""
        logger.info("JARVIS Background Agent starting up")
        self._start_heartbeat()
        self._tray.start()
        self._wwd.start()

        # Main poll loop
        try:
            while not self._stop_event.is_set():
                self._poll_control_signals()
                self._stop_event.wait(1.0)
        finally:
            self._cleanup()
        return 0

    def request_stop(self) -> None:
        logger.info("Shutdown requested")
        self._stopping = True
        self._sm.transition(AgentState.SHUTTING_DOWN, force=True)
        self._stop_event.set()

    # ── Wake-word callback ─────────────────────────────────────────────────────
    def _on_wake_word(self, phrase: str) -> None:
        """Called from the audio thread when a wake phrase is detected."""
        if not self._sm.can_activate():
            logger.debug(
                "Wake phrase '%s' ignored in state %s", phrase, self._sm.state.value
            )
            return

        logger.info("Wake phrase detected: '%s' — activating JARVIS", phrase)
        threading.Thread(
            target=self._activate,
            name="jarvis-activator",
            daemon=True,
        ).start()

    # ── Activation/Deactivation ────────────────────────────────────────────────
    def _activate(self) -> None:
        if not self._sm.transition(AgentState.ACTIVATING):
            return
        logger.info("Starting LiveKit voice worker…")

        if not self._session.start():
            logger.error("Failed to start LiveKit worker")
            self._sm.transition(AgentState.STANDBY)
            return

        # Wait for the worker to be confirmed running (up to 15 s)
        deadline = time.time() + 15.0
        while time.time() < deadline:
            if self._session.is_running():
                break
            time.sleep(0.5)
        else:
            logger.error("Worker did not start in time")
            self._session.stop(graceful=False)
            self._sm.transition(AgentState.STANDBY)
            return

        # Temporarily stop wake-word detection to free mic for LiveKit
        self._wwd.stop()
        self._sm.transition(AgentState.ACTIVE)
        logger.info("JARVIS is now ACTIVE")

    def _deactivate(self, *, reason: str = "user_request") -> None:
        if not self._sm.can_deactivate():
            return
        self._sm.transition(AgentState.DEACTIVATING)
        logger.info("Deactivating JARVIS (%s)…", reason)

        self._session.stop(graceful=True)

        # Restart wake-word listener for next activation
        time.sleep(0.5)
        if not self._stopping:
            self._wwd.start()
        self._sm.transition(AgentState.STANDBY)
        logger.info("JARVIS returned to STANDBY")

    # ── Worker exit callback ───────────────────────────────────────────────────
    def _on_worker_exit(self, returncode: int) -> None:
        """Called when the LiveKit subprocess exits."""
        state = self._sm.state
        if state == AgentState.SHUTTING_DOWN:
            return

        if state in (AgentState.ACTIVE, AgentState.ACTIVATING):
            # Check if the worker wrote a stop signal (graceful goodbye)
            if STOP_PATH.exists():
                STOP_PATH.unlink(missing_ok=True)
                logger.info("Worker exited via stop signal (goodbye phrase)")
                # Already in ACTIVE — deactivate cleanly
                self._sm.transition(AgentState.DEACTIVATING)
            else:
                logger.warning("Worker exited unexpectedly (code %d)", returncode)
                self._sm.transition(AgentState.DEACTIVATING)

            # Restart wake-word detection
            time.sleep(1.0)
            if not self._stopping:
                self._wwd.start()
            self._sm.transition(AgentState.STANDBY)

    # ── Control signal polling ─────────────────────────────────────────────────
    def _poll_control_signals(self) -> None:
        """Check for signal files written by API endpoints or the tray."""
        if ACTIVATE_PATH.exists():
            ACTIVATE_PATH.unlink(missing_ok=True)
            if self._sm.can_activate():
                threading.Thread(
                    target=self._activate,
                    name="jarvis-activator-signal",
                    daemon=True,
                ).start()

        if DEACTIVATE_PATH.exists():
            DEACTIVATE_PATH.unlink(missing_ok=True)
            if self._sm.can_deactivate():
                threading.Thread(
                    target=self._deactivate,
                    args=(),
                    kwargs={"reason": "api_request"},
                    name="jarvis-deactivator-signal",
                    daemon=True,
                ).start()

        if _PAUSE_SIGNAL.exists():
            _PAUSE_SIGNAL.unlink(missing_ok=True)
            self.pause()

        if _RESUME_SIGNAL.exists():
            _RESUME_SIGNAL.unlink(missing_ok=True)
            self.resume()

    # ── State-change callback ──────────────────────────────────────────────────
    def _on_state_change(self, old: AgentState, new: AgentState) -> None:
        # Write heartbeat immediately on state change
        self._write_heartbeat(new)

    # ── Heartbeat ─────────────────────────────────────────────────────────────
    def _start_heartbeat(self) -> None:
        self._heartbeat_stop.clear()
        self._heartbeat_thread = threading.Thread(
            target=self._heartbeat_loop,
            name="jarvis-heartbeat",
            daemon=True,
        )
        self._heartbeat_thread.start()
        atexit.register(self._stop_heartbeat)

    def _heartbeat_loop(self) -> None:
        while not self._heartbeat_stop.is_set():
            self._write_heartbeat(self._sm.state)
            self._heartbeat_stop.wait(5.0)

    def _write_heartbeat(self, state: AgentState) -> None:
        try:
            # Map our rich state to the simple "running"/"stopped" that
            # agent_status_service.read_agent_status() understands, while also
            # writing the full state for the extended dashboard.
            simple_state = (
                "running"
                if state in (AgentState.STANDBY, AgentState.ACTIVE, AgentState.ACTIVATING, AgentState.DEACTIVATING, AgentState.PAUSED)
                else "stopped"
            )
            _write_extended_heartbeat(simple_state, state, self._agent_name, os.getpid())
        except OSError:
            logger.debug("Heartbeat write failed", exc_info=True)

    def _stop_heartbeat(self) -> None:
        self._heartbeat_stop.set()
        try:
            _write_extended_heartbeat("stopped", AgentState.SHUTTING_DOWN, self._agent_name, os.getpid())
        except OSError:
            pass

    # ── Pause/Resume ──────────────────────────────────────────────────────────
    def pause(self) -> bool:
        if self._sm.state != AgentState.STANDBY:
            return False
        self._wwd.stop()
        self._sm.transition(AgentState.PAUSED)
        logger.info("JARVIS paused")
        return True

    def resume(self) -> bool:
        if self._sm.state != AgentState.PAUSED:
            return False
        self._wwd.start()
        self._sm.transition(AgentState.STANDBY)
        logger.info("JARVIS resumed")
        return True

    # ── Cleanup ────────────────────────────────────────────────────────────────
    def _cleanup(self) -> None:
        logger.info("Cleaning up background agent…")
        self._wwd.stop()
        if self._session.is_running():
            self._session.stop(graceful=True)
        self._tray.stop()
        self._stop_heartbeat()


# ── Extended heartbeat writer (adds lifecycle_state field) ────────────────────
import json  # noqa: E402


def _write_extended_heartbeat(
    simple_state: str,
    lifecycle_state: AgentState,
    agent_name: str,
    pid: int,
) -> None:
    from app.services.agent_status_service import heartbeat_path

    path = heartbeat_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    tmp.write_text(
        json.dumps(
            {
                "state": simple_state,
                "lifecycle_state": lifecycle_state.value,
                "agent_name": agent_name,
                "pid": pid,
                "timestamp": time.time(),
            }
        ),
        encoding="utf-8",
    )
    tmp.replace(path)


# ── Entrypoint ────────────────────────────────────────────────────────────────
def main() -> int:
    parser = argparse.ArgumentParser(
        description="JARVIS Background Voice Agent"
    )
    parser.add_argument(
        "--restart-delay", type=float, default=5.0,
        help="Seconds to wait before restarting a crashed worker",
    )
    parser.add_argument(
        "--log-level", default="INFO",
        choices=["DEBUG", "INFO", "WARNING", "ERROR"],
    )
    args = parser.parse_args()

    logging.basicConfig(
        level=getattr(logging, args.log_level),
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )

    # Single-instance guard
    instance = SingleInstance(LOCK_PATH)
    if not instance.acquire():
        logger.error(
            "Another JARVIS background agent is already running. Exiting."
        )
        return 1

    agent = BackgroundAgent(restart_delay=args.restart_delay)

    # OS signal handling
    def _shutdown(signum: int, _frame: object) -> None:
        logger.info("Signal %d received — shutting down", signum)
        agent.request_stop()

    signal.signal(signal.SIGINT, _shutdown)
    if hasattr(signal, "SIGTERM"):
        signal.signal(signal.SIGTERM, _shutdown)

    try:
        return agent.run()
    finally:
        instance.release()


if __name__ == "__main__":
    raise SystemExit(main())
