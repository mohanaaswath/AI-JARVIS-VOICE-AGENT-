# Testing Guide

## Automated checks

```powershell
.\venv\Scripts\python.exe -m pytest -q
.\venv\Scripts\python.exe -m compileall -q backend
Push-Location frontend
npm run build
npm run lint
Pop-Location
```

## Manual checks still required

- Microphone permission and selected input device.
- Assistant audio on the selected Windows output device.
- Worker restart and duplicate-worker behavior.
- Start-after-sign-in behavior.
- Wake-word false activation and mute behavior.
- File operations in temporary directories.
- Browser confirmation flows.
- Dashboard reconnection after the worker or browser restarts.
- The complete acceptance workflow in the master specification.
