"""Independent Windows-session supervisor for the JARVIS voice worker."""
from __future__ import annotations

import argparse
import logging
import os
from pathlib import Path
import signal
import subprocess
import sys
import time

try:
    import msvcrt
except ImportError:
    msvcrt = None

LOGGER = logging.getLogger("jarvis.local_agent")
PROJECT_ROOT = Path(__file__).resolve().parent.parent
LOCK_PATH = Path(os.getenv("LOCALAPPDATA") or os.getenv("TEMP") or ".") / "Jarvis" / "agent.lock"


class SingleInstance:
    def __init__(self, path: Path) -> None:
        self.path = path
        self.handle = None

    def acquire(self) -> bool:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.handle = self.path.open("a+")
        if msvcrt is None:
            return True
        try:
            self.handle.seek(0)
            msvcrt.locking(self.handle.fileno(), msvcrt.LK_NBLCK, 1)
            return True
        except OSError:
            self.handle.close()
            self.handle = None
            return False

    def release(self) -> None:
        if self.handle is None:
            return
        if msvcrt is not None:
            try:
                self.handle.seek(0)
                msvcrt.locking(self.handle.fileno(), msvcrt.LK_UNLCK, 1)
            except OSError:
                LOGGER.debug("Agent lock was already released", exc_info=True)
        self.handle.close()
        self.handle = None


def build_worker_command() -> list[str]:
    return [sys.executable, "-m", "agent", "start"]


def run_supervisor(restart_delay: float = 5.0) -> int:
    instance = SingleInstance(LOCK_PATH)
    if not instance.acquire():
        LOGGER.info("Another JARVIS local agent is already running.")
        return 0

    stopping = False

    def stop(_signum: int, _frame: object) -> None:
        nonlocal stopping
        stopping = True

    signal.signal(signal.SIGINT, stop)
    if hasattr(signal, "SIGTERM"):
        signal.signal(signal.SIGTERM, stop)

    try:
        while not stopping:
            LOGGER.info("Starting LiveKit voice worker.")
            process = subprocess.Popen(build_worker_command(), cwd=Path(__file__).parent)
            while process.poll() is None and not stopping:
                time.sleep(1)
            if stopping and process.poll() is None:
                process.terminate()
                process.wait(timeout=10)
                break
            LOGGER.error("Voice worker exited with code %s; restarting.", process.returncode)
            time.sleep(restart_delay)
    finally:
        instance.release()
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Run the independent JARVIS Windows agent.")
    parser.add_argument("--restart-delay", type=float, default=5.0)
    args = parser.parse_args()
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )
    return run_supervisor(restart_delay=max(1.0, args.restart_delay))


if __name__ == "__main__":
    raise SystemExit(main())
