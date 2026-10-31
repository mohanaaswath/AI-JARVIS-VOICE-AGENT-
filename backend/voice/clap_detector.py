"""Small offline double-clap detector for the Windows local agent."""
from __future__ import annotations

import threading
import time
from collections.abc import Callable


def wait_for_double_clap(
    stop_event: threading.Event,
    *,
    clap_window_seconds: float = 0.8,
    threshold: float = 0.55,
    stream_factory: Callable[..., object] | None = None,
) -> bool:
    """Block until two loud transients arrive or ``stop_event`` is set."""
    if clap_window_seconds <= 0:
        raise ValueError("clap_window_seconds must be positive.")
    if not 0.0 < threshold <= 1.0:
        raise ValueError("threshold must be between 0 and 1.")

    if stream_factory is None:
        try:
            import sounddevice as sd
        except ImportError as exc:
            raise RuntimeError("sounddevice is required for double-clap activation.") from exc
        stream_factory = sd.InputStream

    clap_times: list[float] = []
    activated = threading.Event()
    last_clap = 0.0
    lock = threading.Lock()

    def on_audio(indata: object, _frames: int, _time: object, _status: object) -> None:
        nonlocal last_clap
        try:
            peak = max(abs(float(sample[0])) for sample in indata)
        except (AttributeError, TypeError, ValueError, IndexError):
            return
        now = time.monotonic()
        if peak < threshold:
            return
        with lock:
            if now - last_clap < 0.12:
                return
            last_clap = now
            clap_times[:] = [timestamp for timestamp in clap_times if now - timestamp <= clap_window_seconds]
            clap_times.append(now)
            if len(clap_times) >= 2:
                activated.set()
                clap_times.clear()

    try:
        with stream_factory(
            samplerate=16000,
            channels=1,
            dtype="float32",
            blocksize=512,
            callback=on_audio,
        ):
            while not stop_event.is_set() and not activated.wait(0.1):
                pass
    except Exception as exc:
        raise RuntimeError(f"Unable to listen for double claps: {exc}") from exc
    return activated.is_set()
