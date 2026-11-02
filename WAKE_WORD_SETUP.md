# Offline Activation

The Windows local agent has an offline detector boundary:

1. Start `backend\voice\background_agent.py`.
2. The detector listens through the default input device without uploading
   standby audio.
3. A verified wake-word model emits an activation event.
4. The existing LiveKit voice worker starts and lifecycle moves to `ACTIVE`.
5. A goodbye transcript ends the worker and lifecycle returns to `STANDBY`.

Install optional Windows dependencies with:

```powershell
..\venv\Scripts\python.exe -m pip install -r backend\requirements.txt
```

The current fallback is two claps within approximately 0.8 seconds when
`openwakeword` is unavailable. It is intended for diagnostics only and does
not satisfy the required “Hello Jarvis” or “Hey Jarvis” acceptance phrases.
