"""Offline speech recognition for the JARVIS wake phrase (no clap fallback)."""
from __future__ import annotations

import json
import logging
import os
import queue
import re
import threading
from pathlib import Path
from typing import Callable

logger = logging.getLogger("jarvis.wake_word")
WAKE_PHRASE = "hello jarvis"
MODEL_URL = "https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip"
WakeCallback = Callable[[str], None]


class WakeWordDetector:
    """Listen locally for the spoken phrase ``Hello Jarvis`` using Vosk."""

    def __init__(self, sensitivity: float = 0.5, sample_rate: int = 16000, chunk_size: int = 8000) -> None:
        del sensitivity, chunk_size  # Vosk controls its own recognition threshold.
        self._sample_rate = sample_rate
        self._callbacks: list[WakeCallback] = []
        self._stop_event = threading.Event()
        self._thread: threading.Thread | None = None
        self._muted = False
        self._lock = threading.Lock()

    def register_callback(self, cb: WakeCallback) -> None:
        self._callbacks.append(cb)

    @property
    def sensitivity(self) -> float:
        return 0.5

    @sensitivity.setter
    def sensitivity(self, value: float) -> None:
        del value

    @property
    def muted(self) -> bool:
        return self._muted

    @muted.setter
    def muted(self, value: bool) -> None:
        with self._lock:
            self._muted = value

    def is_running(self) -> bool:
        return self._thread is not None and self._thread.is_alive()

    def start(self) -> None:
        if self.is_running():
            return
        self._stop_event.clear()
        self._thread = threading.Thread(target=self._listen_loop, name="jarvis-wake-word", daemon=True)
        self._thread.start()
        logger.info("Listening locally for '%s'", WAKE_PHRASE)

    def stop(self) -> None:
        self._stop_event.set()
        if self._thread is not None:
            self._thread.join(timeout=5.0)
            self._thread = None

    @staticmethod
    def _model_path() -> Path:
        configured = os.getenv("JARVIS_VOSK_MODEL")
        if configured:
            return Path(configured)
        base = Path(os.getenv("LOCALAPPDATA") or os.getenv("TEMP") or ".")
        return base / "Jarvis" / "models" / "vosk-model-small-en-us-0.15"

    @classmethod
    def _ensure_model(cls) -> Path:
        """Download the small offline English model once, if it is missing."""
        import urllib.request
        import zipfile

        model_path = cls._model_path()
        if model_path.is_dir():
            return model_path
        model_path.parent.mkdir(parents=True, exist_ok=True)
        archive = model_path.parent / (model_path.name + ".zip")
        logger.info("Downloading the offline wake-word model (first run only).")
        urllib.request.urlretrieve(MODEL_URL, archive)
        try:
            with zipfile.ZipFile(archive) as zipped:
                root = model_path.parent.resolve()
                for item in zipped.infolist():
                    destination = (model_path.parent / item.filename).resolve()
                    if destination != root and root not in destination.parents:
                        raise RuntimeError("Unsafe path in Vosk model archive")
                zipped.extractall(model_path.parent)
        finally:
            archive.unlink(missing_ok=True)
        if not model_path.is_dir():
            raise RuntimeError(f"Vosk model was not extracted to {model_path}")
        return model_path

    @staticmethod
    def _normalize(text: str) -> str:
        return " ".join(re.sub(r"[^a-z0-9 ]", " ", text.casefold()).split())

    def _listen_loop(self) -> None:
        try:
            import sounddevice as sd
            from vosk import KaldiRecognizer, Model

            model = Model(str(self._ensure_model()))
            recognizer = KaldiRecognizer(model, self._sample_rate)
            audio_queue: queue.Queue[bytes] = queue.Queue(maxsize=12)

            def on_audio(indata, _frames, _time, status) -> None:
                if status:
                    logger.debug("Microphone status: %s", status)
                try:
                    audio_queue.put_nowait(bytes(indata))
                except queue.Full:
                    pass

            with sd.RawInputStream(
                samplerate=self._sample_rate,
                blocksize=4000,
                dtype="int16",
                channels=1,
                callback=on_audio,
            ):
                while not self._stop_event.is_set():
                    try:
                        audio = audio_queue.get(timeout=0.2)
                    except queue.Empty:
                        continue
                    if self._muted:
                        continue
                    if recognizer.AcceptWaveform(audio):
                        transcript = json.loads(recognizer.Result()).get("text", "")
                        if WAKE_PHRASE in self._normalize(transcript):
                            logger.info("Wake phrase detected: '%s'", WAKE_PHRASE)
                            for callback in list(self._callbacks):
                                try:
                                    callback(WAKE_PHRASE)
                                except Exception:
                                    logger.exception("Wake callback failed")
        except Exception:
            logger.exception("Wake-word listening stopped; no clap fallback is enabled")


def is_available() -> bool:
    import importlib.util

    return all(importlib.util.find_spec(name) is not None for name in ("vosk", "sounddevice"))
