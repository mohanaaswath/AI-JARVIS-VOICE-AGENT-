# Current Architecture

```text
Browser (React/Vite)
  ├─ /api/health, /api/livekit/status
  ├─ /api/livekit/token
  └─ LiveKit WebRTC room
             │
             ▼
FastAPI (backend/app)
  ├─ configuration and CORS
  ├─ token issuance
  ├─ system/action APIs
  ├─ permission and approval service
  ├─ activity service
  └─ Windows system service
             │
             ▼
LiveKit Agents worker (backend/agent.py)
  ├─ Google Realtime Voice
  ├─ registered function tools
  └─ Windows action services
```

## Boundaries

- `frontend/src/components/VoiceView.tsx` owns browser microphone capture,
  LiveKit room lifecycle, and assistant audio playback.
- `backend/app/api` owns HTTP contracts.
- `backend/app/services` owns action policy, Windows operations, verification,
  and activity state.
- `backend/tools` adapts safe services into LiveKit function tools.
- `backend/agent.py` owns the LiveKit worker and voice-session lifecycle.

## Operational limitation

The worker is a separately started process, but it is not yet a complete
Windows background assistant: it has no wake-word loop, tray lifecycle,
single-instance guard, or offline speech pipeline.

The worker now writes a short-lived heartbeat under the per-user local
application-data directory. The backend exposes that heartbeat through
`GET /api/agent/status`; this reports worker liveness, not wake-word readiness.
