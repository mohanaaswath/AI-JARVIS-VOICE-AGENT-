# API Documentation

## Existing endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Backend and LiveKit readiness |
| GET | `/api/livekit/status` | LiveKit configuration status |
| POST | `/api/livekit/token` | Issue a short-lived room token |
| GET | `/api/system/status` | Windows system diagnostics |
| POST | `/api/system/actions` | Execute a validated action |
| GET | `/api/activity` | Read recent action history |
| GET | `/api/approvals/pending` | List pending approvals |

`open_website` is a validated action available through the LiveKit assistant
tool and `/api/system/actions`. It accepts supported aliases such as
`youtube`, `google`, `github`, `gmail`, and `stackoverflow`, or an HTTP(S)
URL. It does not submit forms or handle authentication.

All API routes other than `GET /api/health` require `Authorization: Bearer
<API_AUTH_TOKEN>` for remote requests. In development, loopback requests may
omit the token unless `API_AUTH_TOKEN` is configured. Production startup
requires `APP_ENV=production`, `API_AUTH_TOKEN`, `HTTPS_ONLY=true`, and
HTTPS-only `ALLOWED_ORIGINS`. See [DEPLOYMENT_SECURITY.md](DEPLOYMENT_SECURITY.md)
before deploying; the token grants access to local Windows automation and must
be kept private.
