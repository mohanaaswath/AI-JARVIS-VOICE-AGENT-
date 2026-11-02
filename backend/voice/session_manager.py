"""
voice/session_manager.py — Manages the LiveKit voice-session lifecycle.

Responsibilities:
  - Start the LiveKit agent worker as a subprocess.
  - Monitor the worker process for crashes and report them.
  - Gracefully stop the worker on deactivation.
  - Prevent duplicate sessions.
  - Write activation / deactivation signals to the shared control directory.
"""
from __future__ import annotations

import logging
import os
import subprocess
import sys
import threading
import time
from pathlib import Path
from typing import Callable

logger = logging.getLogger("jarvis.session_manager")

CONTROL_DIR = Path(os.getenv("LOCALAPPDATA") or os.getenv("TEMP") or ".") / "Jarvis"
STOP_PATH = CONTROL_DIR / "agent.stop"

ExitCallback = Callable[[int], None]  # called with returncode when worker exits


class SessionManager:
    """
    Manages a single LiveKit agent worker subprocess.

    Usage:
        mgr = SessionManager()
        mgr.register_exit_callback(on_worker_exit)
        mgr.start()          # launch the worker
        ...
        mgr.stop(graceful=True)   # ask it to stop; then terminate after timeout
    """

    def __init__(
        self,
        backend_dir: Path | None = None,
        python_exe: str | None = None,
    ) -> None:
        self._backend_dir = backend_dir or Path(__file__).resolve().parent.parent
        self._python = python_exe or sys.executable
        self._process: subprocess.Popen | None = None
        self._lock = threading.Lock()
        self._exit_callbacks: list[ExitCallback] = []
        self._monitor_thread: threading.Thread | None = None

    # ── Public API ────────────────────────────────────────────────────────────
    def register_exit_callback(self, cb: ExitCallback) -> None:
        self._exit_callbacks.append(cb)

    def is_running(self) -> bool:
        with self._lock:
            return self._process is not None and self._process.poll() is None

    def pid(self) -> int | None:
        with self._lock:
            return self._process.pid if self._process else None

    def start(self) -> bool:
        """
        Launch the LiveKit agent worker.  Returns False if already running.
        """
        with self._lock:
            if self._process is not None and self._process.poll() is None:
                logger.warning("Worker already running (PID %d)", self._process.pid)
                return False

            # Clear any leftover stop signal
            STOP_PATH.unlink(missing_ok=True)
            CONTROL_DIR.mkdir(parents=True, exist_ok=True)

            cmd = [self._python, "-m", "agent", "start"]
            try:
                self._process = subprocess.Popen(
                    cmd,
                    cwd=str(self._backend_dir),
                )
                logger.info(
                    "LiveKit worker started (PID %d)", self._process.pid
                )
            except FileNotFoundError as exc:
                logger.error("Cannot launch worker: %s", exc)
                return False

        self._start_monitor()
        return True

    def stop(self, *, graceful: bool = True, timeout: float = 12.0) -> None:
        """
        Stop the running worker.
        If *graceful* is True, write the stop-signal file first and wait *timeout*
        seconds before forcefully terminating.
        """
        with self._lock:
            proc = self._process

        if proc is None:
            return

        if graceful:
            try:
                STOP_PATH.parent.mkdir(parents=True, exist_ok=True)
                STOP_PATH.touch()
                logger.info("Wrote stop signal; waiting for worker to exit…")
            except OSError:
                pass

            deadline = time.time() + timeout
            while time.time() < deadline:
                if proc.poll() is not None:
                    break
                time.sleep(0.5)

        if proc.poll() is None:
            logger.warning("Worker did not exit gracefully; terminating")
            try:
                proc.terminate()
                proc.wait(timeout=5.0)
            except Exception:
                proc.kill()

        with self._lock:
            if self._process is proc:
                self._process = None
        logger.info("Worker stopped")

    # ── Internal ──────────────────────────────────────────────────────────────
    def _start_monitor(self) -> None:
        if self._monitor_thread and self._monitor_thread.is_alive():
            return
        self._monitor_thread = threading.Thread(
            target=self._monitor_loop,
            name="jarvis-worker-monitor",
            daemon=True,
        )
        self._monitor_thread.start()

    def _monitor_loop(self) -> None:
        with self._lock:
            proc = self._process
        if proc is None:
            return

        returncode = proc.wait()
        with self._lock:
            if self._process is proc:
                self._process = None

        logger.info("LiveKit worker exited with code %d", returncode)
        for cb in list(self._exit_callbacks):
            try:
                cb(returncode)
            except Exception:
                logger.exception("Worker exit callback raised")
