# API Documentation

## Existing endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Backend and LiveKit readiness |
| GET | `/api/livekit/status` | LiveKit configuration status |
| POST | `/api/livekit/token` | Issue a short-lived room token |
| GET | `/api/agent/status` | Read the local worker heartbeat |
| GET | `/api/system/status` | Windows system diagnostics |
| POST | `/api/system/actions` | Execute a validated action |
| GET | `/api/activity` | Read recent action history |
| GET | `/api/approvals/pending` | List pending approvals |

`open_website` is a validated action available through the LiveKit assistant
tool and `/api/system/actions`. It accepts supported aliases such as
`youtube`, `google`, `github`, `gmail`, and `stackoverflow`, or an HTTP(S)
URL. It does not submit forms or handle authentication.

The local-agent API and WebSocket contract will be added only after local
authentication and origin restrictions are defined. The automation API must
not be exposed publicly by default.
