"""
chat.py — Endpoints for multi-provider AI chat and completion.
"""
import logging
from fastapi import APIRouter, HTTPException
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.ai_service import get_ai_service

logger = logging.getLogger(__name__)
router = APIRouter(tags=["AI Chat"])


@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest) -> ChatResponse:
    """
    Generate an AI response using the requested provider (Gemini, OpenAI, Claude)
    with optional real-time web search enhancement.
    """
    try:
        service = get_ai_service()
        response = await service.generate_response(
            messages=request.messages,
            provider=request.provider or "gemini",
            model=request.model,
            api_key=request.api_key,
            web_search=bool(request.web_search),
            temperature=request.temperature if request.temperature is not None else 0.7,
        )
        return response
    except Exception as exc:
        logger.error("Chat endpoint error: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))
