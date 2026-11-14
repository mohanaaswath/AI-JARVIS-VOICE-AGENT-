# Secure backend deployment

The GitHub Pages frontend is public. Never put `API_AUTH_TOKEN`, LiveKit API
credentials, or Google credentials in frontend environment variables or the
published `docs/` directory.

## Required backend environment

Set these variables in the backend host's secret/environment settings:

```dotenv
APP_ENV=production
HTTPS_ONLY=true
DEBUG=false
API_AUTH_TOKEN=<long random secret generated on the backend host>
ALLOWED_ORIGINS=https://mohanaaswath.github.io
LIVEKIT_URL=wss://<your-project>.livekit.cloud
LIVEKIT_API_KEY=<server-side LiveKit API key>
LIVEKIT_API_SECRET=<server-side LiveKit API secret>
LIVEKIT_AGENT_NAME=my-agent
```

Generate an API token on a trusted machine with:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Give that token only to the intended operator. The site asks for it when the
first protected API call receives an authentication challenge and retains it
in that browser tab's session storage. Do not commit or paste it into frontend
source or GitHub Pages build settings.

## HTTPS and network boundary

Terminate TLS at the backend host or a trusted reverse proxy, and configure
Uvicorn to honor forwarded headers only from that proxy's address (for example,
with `--proxy-headers --forwarded-allow-ips=<trusted-proxy-IP>`). Do not trust
forwarded headers from arbitrary clients. The application rejects requests
that arrive as HTTP when `HTTPS_ONLY=true`; it also refuses production startup
unless a 32+ character token, HTTPS enforcement, `DEBUG=false`, and HTTPS-only
allowed origins are configured. Do not expose a separate plain-HTTP Uvicorn
port to the internet. Use the host's managed TLS certificate and renew it
automatically.

Set `VITE_API_BASE_URL` at frontend build time to the backend's HTTPS origin
(for example, `https://jarvis-api.example.com`) and rebuild/publish the Pages
site. The API host must allow the exact GitHub Pages origin above. CORS is an
additional browser restriction; bearer authentication remains required for
remote clients.

The backend API token grants access to Windows status, automation, approvals,
agent controls, and LiveKit token creation. Keep the backend private behind
HTTPS and share the token only with the operator. Rotate it immediately if
exposed. GitHub Pages is a public static site, so this is a single-operator
shared-token setup, not per-user identity or multi-user authorization.
