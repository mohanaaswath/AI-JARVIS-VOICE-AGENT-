# JARVIS Project Analysis

## Verified current state

- The frontend is a React/Vite single-page application with Dashboard, Voice,
  and Settings views.
- The backend is a FastAPI application under `backend/app`.
- The voice path is browser -> FastAPI token endpoint -> LiveKit Cloud ->
  `backend/agent.py` -> Google Realtime Voice.
- Windows actions are implemented in `SystemService` and exposed through
  LiveKit function tools and backend action endpoints.
- Permission checks, approval objects, activity recording, and result
  verification already exist for the current action set.
- The repository has focused pytest coverage for permissions, files,
  applications, settings, volume, activity, schemas, and LiveKit tools.
- The current browser voice session depends on the worker process. Closing the
  browser does not stop that worker, but no independent wake-word agent exists.

## Working features

- LiveKit token generation and configuration health checks.
- Google Realtime Voice session with microphone input and assistant audio.
- Safe application allowlist, permitted file roots, and Windows Settings
  allowlist.
- System, battery, memory, network, display, and audio diagnostics.
- Volume and dark-mode controls with verification.
- Approval lifecycle for higher-risk backend actions.
- Activity history and dashboard polling.
- Windows launcher batch files.

## Gaps and risks

- There is no independent background process with tray UI, wake word, offline
  speech recognition, or local text-to-speech.
- Website aliases and validated HTTP(S) opening are implemented; full
  Playwright tab/form automation is not implemented.
- File operations are currently narrower than the requested create, move,
  copy, rename, search, and PDF workflows.
- Application control is an allowlist, not installed-application discovery or
  window management.
- The dashboard has no authenticated local-agent channel or WebSocket.
- The current in-memory approval and activity stores are lost on restart.
- The frontend uses a Vite proxy in development; production API routing and
  CORS must be configured explicitly.
- Credentials must remain in local environment files and should be rotated
  whenever exposed outside the machine.

## Conclusion

The existing project is a working LiveKit voice-control prototype with useful
security primitives. It is not yet an always-available Windows desktop
assistant. The safest migration is incremental: preserve the LiveKit path,
add a local agent boundary, then add offline wake word, speech, tools, and
dashboard integration behind the existing permission and verification layers.
