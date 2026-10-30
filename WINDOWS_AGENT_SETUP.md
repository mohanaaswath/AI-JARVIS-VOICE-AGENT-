# Windows Agent Setup

The current worker is the LiveKit voice worker, not yet the independent
offline background agent described in the target architecture.

## Start the current worker

```powershell
Push-Location backend
..\venv\Scripts\python.exe local_agent.py
Pop-Location
```

Keep the process running while using the browser voice view. The backend and
frontend can be started with `start-jarvis.bat`.

The supervisor prevents duplicate local agents and restarts the LiveKit worker
after an unexpected exit. It runs in the interactive Windows user session so
microphone and desktop operations remain available.

The assistant can open supported public websites by voice, for example:
“Open YouTube” or “Open https://github.com”. Full browser automation is still
planned and is not enabled by this feature.

## Required configuration

Keep credentials in `frontend\.env`, which is ignored by Git. Never place
LiveKit secrets or Google credentials in frontend `VITE_*` variables.

## Planned background mode

The independent Windows agent will be added after the local lifecycle and
authentication boundary is implemented. It must run in the interactive user
session rather than as a service that cannot access the microphone.
