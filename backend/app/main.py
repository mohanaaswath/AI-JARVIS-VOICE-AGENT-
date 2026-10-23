"""
main.py — FastAPI application entry point.
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.api import health, chat, livekit
from app.services.assistant_service import AssistantService
from app.services.livekit_service import LiveKitService

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize shared services on startup; clean up on shutdown."""
    settings = get_settings()

    # -- Assistant (Gemini text chat) --
    if settings.GOOGLE_API_KEY:
        try:
            app.state.assistant_service = AssistantService(api_key=settings.GOOGLE_API_KEY)
            logger.info("AssistantService (Gemini) initialized.")
        except Exception as exc:
            logger.error("Failed to init AssistantService: %s", exc)
            app.state.assistant_service = None
    else:
        logger.warning("GOOGLE_API_KEY not set — text chat disabled.")
        app.state.assistant_service = None

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
    description="Backend for the JARVIS AI Voice & Chat Assistant",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS ────────────────────────────────────────────────────────────────────
settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ──────────────────────────────────────────────────────────────────
app.include_router(health.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(livekit.router, prefix="/api")


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
    return {"message": "JARVIS AI Assistant backend is running.", "docs": "/docs"}
