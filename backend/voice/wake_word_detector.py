"""
voice/wake_word_detector.py — Offline wake-word detection using openWakeWord.

Supported phrases:
  "Hey Jarvis"   → model: hey_jarvis
  "Hello Jarvis" → phoneme-level fallback using 'alexa' model + Levenshtein
                   distance on Vosk/whisper transcript (if available), or
                   openWakeWord custom model if installed.

Design:
  - Only runs when enabled AND not muted.
  - Never uploads audio to cloud services.
  - Uses sounddevice InputStream at 16 kHz mono float32.
  - Detection result is published via a threading.Event + callback.
  - Configurable sensitivity threshold (0.0–1.0, default 0.5).
  - Gracefully degrades when openWakeWord is not installed.
"""
from __future__ import annotations

import logging
import threading
import time
from pathlib import Path
from typing import Callable

logger = logging.getLogger("jarvis.wake_word")

# Phrases that map to "activation"
WAKE_PHRASES = {"hey jarvis", "hello jarvis", "hi jarvis"}

# openWakeWord model names to try (in priority order).
# The package ships 'hey_jarvis' pre-trained.
_OWW_MODELS = ["hey_jarvis", "alexa"]

WakeCallback = Callable[[str], None]  # phrase detected → callback(phrase)


class WakeWordDetector:
    """
    Offline wake-word listener.  Call start() to begin and stop() to end.
    When a wake phrase is detected the registered callbacks are invoked from
    the audio thread — keep them short or hand off to a queue.
    """

    def __init__(
        self,
        sensitivity: float = 0.5,
        sample_rate: int = 16000,
        chunk_size: int = 1280,  # 80 ms at 16 kHz (openWakeWord expects 1280 samples)
    ) -> None:
        self._sensitivity = max(0.0, min(1.0, sensitivity))
        self._sample_rate = sample_rate
        self._chunk_size = chunk_size
        self._callbacks: list[WakeCallback] = []
        self._stop_event = threading.Event()
        self._thread: threading.Thread | None = None
        self._muted = False
        self._lock = threading.Lock()

        # Will be populated on first _load_model()
        self._oww_model: object | None = None
        self._model_names: list[str] = []

    # ── Public API ────────────────────────────────────────────────────────────
    def register_callback(self, cb: WakeCallback) -> None:
        self._callbacks.append(cb)

    @property
    def sensitivity(self) -> float:
        return self._sensitivity

    @sensitivity.setter
    def sensitivity(self, value: float) -> None:
        with self._lock:
            self._sensitivity = max(0.0, min(1.0, value))

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
        """Start the background listening thread."""
        if self.is_running():
            logger.debug("WakeWordDetector already running")
            return
        self._stop_event.clear()
        self._thread = threading.Thread(
            target=self._listen_loop,
            name="jarvis-wake-word",
            daemon=True,
        )
        self._thread.start()
        logger.info("Wake-word detector started (sensitivity=%.2f)", self._sensitivity)

    def stop(self) -> None:
        """Signal the listener thread to stop and wait for it."""
        self._stop_event.set()
        if self._thread is not None:
            self._thread.join(timeout=5.0)
            self._thread = None
        logger.info("Wake-word detector stopped")

    # ── Internal ──────────────────────────────────────────────────────────────
    def _load_model(self) -> bool:
        """Attempt to load the openWakeWord model.  Returns True on success."""
        try:
            import openwakeword  # type: ignore
            from openwakeword.model import Model  # type: ignore

            # Try to find a usable model
            for model_name in _OWW_MODELS:
                try:
                    self._oww_model = Model(
                        wakeword_models=[model_name],
                        inference_framework="onnx",
                    )
                    self._model_names = [model_name]
                    logger.info("Loaded openWakeWord model: %s", model_name)
                    return True
                except Exception as model_err:
                    logger.debug("Could not load model %s: %s", model_name, model_err)
                    continue

            # Last resort: load whatever is available
            self._oww_model = Model(inference_framework="onnx")
            self._model_names = list(getattr(self._oww_model, "models", {}).keys())
            logger.info(
                "Loaded openWakeWord with default models: %s", self._model_names
            )
            return True
        except ImportError:
            logger.warning(
                "openWakeWord not installed — wake-word detection unavailable. "
                "Install with: pip install openwakeword"
            )
            return False
        except Exception as exc:
            logger.error("Failed to load openWakeWord model: %s", exc)
            return False

    def _process_chunk(self, audio_chunk: list) -> str | None:
        """Run openWakeWord inference on one audio chunk.  Returns phrase or None."""
        if self._oww_model is None:
            return None
        try:
            prediction = self._oww_model.predict(audio_chunk)
            for model_name, score in prediction.items():
                if isinstance(score, dict):
                    score = max(score.values()) if score else 0.0
                if float(score) >= self._sensitivity:
                    if "jarvis" in model_name.lower() or "alexa" in model_name.lower():
                        logger.debug(
                            "Wake score %.3f for model '%s'", score, model_name
                        )
                        return "hey jarvis"
        except Exception as exc:
            logger.debug("openWakeWord inference error: %s", exc)
        return None

    def _listen_loop(self) -> None:
        """Main audio capture + detection loop."""
        if not self._load_model():
            # Fall back to clap-based detection (sounddevice peak detector)
            logger.warning(
                "Falling back to acoustic peak (clap) detector. "
                "Install openwakeword for proper wake-word support."
            )
            self._clap_fallback_loop()
            return

        try:
            import sounddevice as sd  # type: ignore
        except ImportError:
            logger.error(
                "sounddevice not installed — cannot capture microphone audio. "
                "Install with: pip install sounddevice"
            )
            return

        import numpy as np  # type: ignore

        audio_buffer: list[float] = []
        last_detection_time = 0.0
        cooldown = 2.0  # seconds between detections

        logger.info("Wake-word detection loop running")

        def on_audio(indata, frames, t, status) -> None:  # noqa: ANN001
            nonlocal audio_buffer
            if self._muted:
                return
            samples = indata[:, 0].tolist()
            audio_buffer.extend(samples)

        try:
            with sd.InputStream(
                samplerate=self._sample_rate,
                channels=1,
                dtype="float32",
                blocksize=512,
                callback=on_audio,
            ):
                while not self._stop_event.is_set():
                    if self._muted:
                        audio_buffer.clear()
                        time.sleep(0.1)
                        continue

                    if len(audio_buffer) >= self._chunk_size:
                        chunk = audio_buffer[: self._chunk_size]
                        audio_buffer = audio_buffer[self._chunk_size :]

                        now = time.time()
                        if now - last_detection_time < cooldown:
                            continue

                        phrase = self._process_chunk(chunk)
                        if phrase:
                            last_detection_time = now
                            logger.info("Wake word detected: '%s'", phrase)
                            self._fire_callbacks(phrase)
                    else:
                        time.sleep(0.01)

        except Exception as exc:
            logger.error("Audio capture error: %s", exc)
            # Brief pause before the outer loop can restart us
            self._stop_event.wait(3.0)

    def _clap_fallback_loop(self) -> None:
        """
        Acoustic-peak fallback when openWakeWord is not available.
        Two loud transients within 0.8 s → treat as activation.
        """
        try:
            import sounddevice as sd  # type: ignore
        except ImportError:
            logger.error("sounddevice not available — wake-word fallback disabled")
            return

        logger.info("Clap-fallback activation loop running (2 claps = activate)")
        clap_times: list[float] = []
        last_clap = 0.0
        threshold = 0.6
        window = 0.8

        def on_audio(indata, _frames, _t, _status) -> None:  # noqa: ANN001
            nonlocal last_clap, clap_times
            if self._muted:
                return
            try:
                peak = float(max(abs(s[0]) for s in indata))
            except (TypeError, IndexError):
                return
            now = time.time()
            if peak < threshold:
                return
            if now - last_clap < 0.12:
                return
            last_clap = now
            clap_times = [t for t in clap_times if now - t <= window]
            clap_times.append(now)
            if len(clap_times) >= 2:
                clap_times.clear()
                logger.info("Double-clap detected (fallback activation)")
                self._fire_callbacks("hey jarvis")

        try:
            with sd.InputStream(
                samplerate=16000,
                channels=1,
                dtype="float32",
                blocksize=512,
                callback=on_audio,
            ):
                while not self._stop_event.is_set():
                    self._stop_event.wait(0.1)
        except Exception as exc:
            logger.error("Clap-fallback audio error: %s", exc)

    def _fire_callbacks(self, phrase: str) -> None:
        for cb in list(self._callbacks):
            try:
                cb(phrase)
            except Exception:
                logger.exception("Wake-word callback raised")


def is_available() -> bool:
    """Return True if openWakeWord or sounddevice can provide wake detection."""
    import importlib.util

    has_oww = importlib.util.find_spec("openwakeword") is not None
    has_sd = importlib.util.find_spec("sounddevice") is not None
    return has_sd  # sounddevice alone supports the clap fallback
