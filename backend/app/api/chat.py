"""
api/chat.py — POST /api/chat  (text conversation with Gemini)
             POST /api/chat/reset (start fresh conversation)
"""
import logging
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.assistant_service import AssistantService
from app.config import get_settings

logger = logging.getLogger(__name__)
router = APIRouter()


def _get_service(request: Request) -> AssistantService:
    """Retrieve the shared AssistantService from app state."""
    svc: AssistantService | None = getattr(request.app.state, "assistant_service", None)
    if svc is None:
        raise HTTPException(
            status_code=503,
            detail="Assistant service is not available. Check GOOGLE_API_KEY.",
        )
    return svc


@router.post("/chat", response_model=ChatResponse, tags=["Chat"])
async def chat(body: ChatRequest, request: Request) -> ChatResponse:
    """Send a text message and receive a reply from the AI assistant."""
    svc = _get_service(request)
    try:
        reply = await svc.chat(body.message)
        return ChatResponse(reply=reply)
    except Exception as exc:
        logger.error("Chat error: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Assistant error: {exc}") from exc


@router.post("/chat/stream", tags=["Chat"])
async def chat_stream(body: ChatRequest, request: Request) -> StreamingResponse:
    """Stream a reply token-by-token (Server-Sent Events)."""
    svc = _get_service(request)

    async def event_stream():
        try:
            async for chunk in svc.stream_chat(body.message):
                # SSE format
                yield f"data: {chunk}\n\n"
        except Exception as exc:
            logger.error("Stream error: %s", exc, exc_info=True)
            yield f"data: [ERROR] {exc}\n\n"
        finally:
            yield "data: [DONE]\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.post("/chat/reset", tags=["Chat"])
async def reset_chat(request: Request) -> dict:
    """Reset the conversation history."""
    svc = _get_service(request)
    svc.reset()
    return {"status": "reset", "message": "Conversation history cleared."}
