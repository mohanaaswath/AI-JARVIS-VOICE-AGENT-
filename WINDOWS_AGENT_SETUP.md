# Windows Agent Setup

The repository includes an independent Windows-session background-agent
entrypoint. It owns lifecycle state, single-instance locking, heartbeat
reporting, optional tray controls, and offline wake-word microphone capture.
The LiveKit worker remains a separate process started after activation.

## Start the background agent

```powershell
Push-Location backend
..\venv\Scripts\python.exe -m voice.background_agent
Pop-Location
```

The agent exposes lifecycle state through `GET /api/agent/status` and accepts
local activation, deactivation, pause, and resume requests through the
`/api/agent/*` control endpoints. It prevents duplicate instances and returns
to `STANDBY` after the LiveKit worker exits.

The current LiveKit conversation still uses the browser's LiveKit room as its
microphone and audio client. Closing the browser therefore stops the usable
conversation path; a native local LiveKit client is still required for the
final browser-independent acceptance workflow.

The assistant can open supported public websites by voice, for example:
“Open YouTube” or “Open https://github.com”. Full browser automation is still
planned and is not enabled by this feature.

## Required configuration

Keep credentials in `frontend\.env`, which is ignored by Git. Never place
LiveKit secrets or Google credentials in frontend `VITE_*` variables.

## Optional startup

Run `setup-jarvis-autostart.bat` to register the launcher at user logon. The
launcher runs in the interactive user session rather than as a Windows
service, so microphone and desktop operations remain available.

## Wake phrase

The listener recognizes “Hello Jarvis” locally with Vosk and `sounddevice`.
The small English model downloads on first launch to
`%LOCALAPPDATA%\Jarvis\models`. There is no clap fallback. On recognition,
Windows speech synthesis gives an immediate spoken greeting. The full LiveKit
conversation still requires the browser voice session to be connected.
