# JARVIS AI Voice Agent

JARVIS is a full-stack voice assistant application. It combines a React/Vite
web interface, a FastAPI backend that issues LiveKit access tokens, and a
LiveKit Agents worker powered by Google Realtime Voice.

## Project layout

```text
JARVISE/
├── backend/
│   ├── agent.py                    LiveKit voice-agent worker
│   ├── prompt.py                   Shared agent instructions and greeting
│   ├── requirements.txt            Backend API dependencies
│   └── app/
│       ├── main.py                 FastAPI application and CORS setup
│       ├── config.py               Environment-based settings
│       ├── api/
│       │   ├── health.py           GET /api/health
│       │   └── livekit.py          LiveKit token and status endpoints
│       ├── schemas/voice.py        Pydantic request/response models
│       └── services/livekit_service.py
│                                     LiveKit JWT generation
├── frontend/
│   ├── src/
│   │   ├── App.tsx                 Main view and navigation shell
│   │   ├── components/             Dashboard, voice, sidebar, settings
│   │   └── lib/api.ts              Backend API client
│   ├── .env.example                Environment template
│   ├── package.json                Frontend scripts and dependencies
│   └── vite.config.ts              Vite dev server and API proxy
├── start-jarvis.bat                Windows one-click launcher
├── requirements.txt                Legacy/shared voice-agent requirements
└── .gitignore
```

Architecture and staged implementation details are documented in
[PROJECT_ANALYSIS.md](PROJECT_ANALYSIS.md),
[CURRENT_ARCHITECTURE.md](CURRENT_ARCHITECTURE.md),
[TARGET_ARCHITECTURE.md](TARGET_ARCHITECTURE.md), and
[IMPLEMENTATION_ROADMAP.md](IMPLEMENTATION_ROADMAP.md).

Generated/local directories such as `venv`, `frontend/node_modules`, and
`frontend/dist` are not source files and are ignored by Git.

## Runtime architecture

1. The browser loads the React app from Vite on `http://localhost:5173`.
2. Vite proxies `/api` requests to FastAPI on `http://localhost:8000`.
3. FastAPI reads LiveKit credentials from environment variables and issues a
   short-lived token at `POST /api/livekit/token`.
4. The browser connects to LiveKit Cloud using that token.
5. The local supervisor waits for two claps before starting the LiveKit worker.
6. The LiveKit agent worker joins the room as `my-agent` and uses Google
   Realtime Voice to converse with the user.
7. Saying “OK Jarvis, bye” ends the active voice session and stops the worker.

## Requirements

- Windows
- Python 3.10 or newer
- Node.js and npm
- A LiveKit Cloud project
- A Google API key for the Google Realtime plugin

The repository currently includes a local virtual environment at
`venv\`. For a new checkout, create one with:

```powershell
py -m venv venv
.\venv\Scripts\python.exe -m pip install -r backend\requirements.txt
.\venv\Scripts\python.exe -m pip install "livekit-agents[google]~=1.8" "livekit-plugins-noise-cancellation~=0.2"
```

Install the frontend dependencies:

```powershell
cd frontend
npm install
cd ..
```

## Environment configuration

Copy `frontend\.env.example` to `frontend\.env` and set:

```dotenv
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret
GOOGLE_API_KEY=your_google_api_key
LIVEKIT_AGENT_NAME=my-agent
```

The backend and agent load this file from `frontend\.env`. Do not commit it or
expose the API secret to browser code.

## Run the application

### One-click Windows startup

Double-click `start-jarvis.bat`. It starts:

- FastAPI at `http://localhost:8000`
- the LiveKit agent worker
- Vite at `http://localhost:5173`

The launcher prefers `venv\Scripts\python.exe` and falls back to `python` if
the virtual environment does not exist.

### Manual startup

Open three PowerShell windows from the repository root:

```powershell
# API
.\venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --port 8000

# Voice agent
Push-Location backend
..\venv\Scripts\python.exe local_agent.py
Pop-Location

# Frontend
cd frontend
npm run dev
```

The local agent waits for two claps before starting the LiveKit worker. Say
“OK Jarvis, bye” to stop the active worker and return to clap standby.

## API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/` | Backend status message |
| GET | `/api/health` | API and LiveKit readiness |
| GET | `/api/livekit/status` | LiveKit configuration status |
| POST | `/api/livekit/token` | Issue a room participant token |
| GET | `/docs` | FastAPI interactive documentation |

Token requests use:

```json
{
  "room_name": "jarvis-demo",
  "participant_identity": "user-123"
}
```

## Validation

Run the checks from the repository root:

```powershell
.\venv\Scripts\python.exe -m pytest -q
.\venv\Scripts\python.exe -m compileall -q backend
Push-Location backend
..\venv\Scripts\python.exe -c "from app.main import app"
Pop-Location
cd frontend
npm run build
npm run lint
```

## Troubleshooting

- **LiveKit is degraded:** verify `LIVEKIT_URL`, `LIVEKIT_API_KEY`, and
  `LIVEKIT_API_SECRET` in `frontend\.env`, then restart the backend.
- **The agent cannot import `livekit.agents`:** run it with
  `.\venv\Scripts\python.exe`, not the system Python, and install the
  dependencies listed above.
- **The frontend cannot reach the API:** ensure FastAPI is running on port
  `8000`; Vite proxies `/api` to that port.
- **Microphone access fails:** allow microphone permission for the browser and
  use a secure/localhost origin.


1.JARVIS AI Voice Agent is a full-stack personal assistant built with React, Vite, FastAPI, LiveKit, and Google Realtime Voice.
2.The frontend provides a modern command-center interface with voice controls, dashboard monitoring, settings, and light/dark themes.
3.The FastAPI backend manages health checks, LiveKit configuration, secure token generation, and API communication.
4.The LiveKit agent enables real-time voice conversations with Google Realtime Voice and noise cancellation.
