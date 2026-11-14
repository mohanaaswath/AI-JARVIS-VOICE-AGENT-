"""
main.py — FastAPI application entry point.
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import PlainTextResponse

from app.config import get_settings
from app.api import agent, health, livekit, system, activity, approvals, agent_control
from app.services.livekit_service import LiveKitService

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


class HTTPSRequiredMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if get_settings().HTTPS_ONLY and request.url.scheme != "https":
            return PlainTextResponse("HTTPS is required.", status_code=426)
        return await call_next(request)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize shared services on startup; clean up on shutdown."""
    settings = get_settings()

    # -- LiveKit (voice token issuer) --
    app.state.livekit_service = LiveKitService(
        api_key=settings.LIVEKIT_API_KEY,
        api_secret=settings.LIVEKIT_API_SECRET,
        url=settings.LIVEKIT_URL,
    )
    if app.state.livekit_service.is_available:
        logger.info("LiveKitService initialized.")
    else:
        logger.warning("LiveKit credentials incomplete — voice token endpoint disabled.")

    yield  # App runs here

    logger.info("Shutting down JARVIS backend.")


app = FastAPI(
    title="JARVIS AI Assistant API",
    description="Backend for the JARVIS LiveKit voice assistant and Windows automation control",
    version="2.0.0",
    lifespan=lifespan,
)

# ── CORS ────────────────────────────────────────────────────────────────────
settings = get_settings()
if settings.APP_ENV == "production":
    if len(settings.API_AUTH_TOKEN) < 32:
        raise RuntimeError("API_AUTH_TOKEN must be at least 32 characters in production.")
    if not settings.HTTPS_ONLY:
        raise RuntimeError("HTTPS_ONLY=true is required in production.")
    if settings.DEBUG:
        raise RuntimeError("DEBUG must be false in production.")
    if not settings.ALLOWED_ORIGINS or any(not origin.startswith("https://") for origin in settings.ALLOWED_ORIGINS):
        raise RuntimeError("Production ALLOWED_ORIGINS must contain only HTTPS origins.")
app.add_middleware(HTTPSRequiredMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ──────────────────────────────────────────────────────────────────
app.include_router(health.router, prefix="/api")
app.include_router(agent.router, prefix="/api")
app.include_router(agent_control.router, prefix="/api")
app.include_router(livekit.router, prefix="/api")
app.include_router(system.router, prefix="/api")
app.include_router(activity.router, prefix="/api")
app.include_router(approvals.router, prefix="/api")


# ── Global exception handler ─────────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled exception: %s", exc, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred.", "code": "INTERNAL_ERROR"},
    )


@app.get("/", tags=["Root"])
async def root():
    return {
        "message": "JARVIS Windows Desktop Voice Assistant backend is running.",
        "version": "2.0.0",
        "docs": "/docs",
    }
