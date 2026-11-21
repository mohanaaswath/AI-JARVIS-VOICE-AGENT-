import logging
from typing import List, Optional
import httpx

from app.config import get_settings
from app.schemas.chat import ChatMessageSchema, ChatResponse, SearchResultItem
from app.services.search_service import get_search_service

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are JARVIS (Just A Rather Very Intelligent System), an advanced AI assistant created to assist the user through voice and web interaction.
You are articulate, proactive, intelligent, and concise.
When speaking or answering voice questions, keep responses natural and focused (1-3 sentences unless asked for an in-depth explanation).
When helping with code, analysis, or creative writing, be precise and use markdown formatting.
If web search results are provided in the prompt, incorporate their factual information accurately and cite the sources.
You have tools to create notes, manage tasks, search the web, and navigate websites for the user."""


class AIService:
    def __init__(self):
        self.settings = get_settings()

    async def generate_response(
        self,
        messages: List[ChatMessageSchema],
        provider: str = "gemini",
        model: Optional[str] = None,
        api_key: Optional[str] = None,
        web_search: bool = False,
        temperature: float = 0.7,
    ) -> ChatResponse:
        search_sources: List[SearchResultItem] = []
        user_query = ""
        for m in reversed(messages):
            if m.role == "user":
                user_query = m.content
                break

        # Execute web search if requested or if query asks for current info
        if web_search and user_query:
            search_svc = get_search_service()
            search_sources = await search_svc.search(user_query, limit=4)

        provider_lower = (provider or "gemini").lower()

        if provider_lower == "gemini":
            return await self._call_gemini(messages, model, api_key, search_sources, temperature)
        elif provider_lower == "openai":
            return await self._call_openai(messages, model, api_key, search_sources, temperature)
        elif provider_lower == "claude":
            return await self._call_claude(messages, model, api_key, search_sources, temperature)
        else:
            # Fallback to Gemini or error
            return await self._call_gemini(messages, model, api_key, search_sources, temperature)

    async def _call_gemini(
        self,
        messages: List[ChatMessageSchema],
        model: Optional[str],
        client_key: Optional[str],
        sources: List[SearchResultItem],
        temperature: float,
    ) -> ChatResponse:
        key = client_key or self.settings.GOOGLE_API_KEY
        chosen_model = model or "gemini-1.5-flash"

        if not key:
            # Provide helpful response if no key is configured
            return ChatResponse(
                content=(
                    "Online AI model is not yet configured with a Google Gemini API key. "
                    "You can enter your API key in the Settings view to enable online cloud intelligence, "
                    "or continue using offline local capabilities, notes, and tasks."
                ),
                provider="gemini",
                model=chosen_model,
                sources=sources if sources else None,
            )

        # Prepare Gemini contents format
        gemini_contents = []
        system_instruction_text = SYSTEM_PROMPT
        if sources:
            source_context = "\n\nReal-time Web Search Results:\n" + "\n".join(
                f"- [{s.title}] ({s.url}): {s.snippet}" for s in sources
            )
            system_instruction_text += source_context

        for msg in messages:
            role = "user" if msg.role == "user" else "model"
            if msg.role == "system":
                continue
            gemini_contents.append({
                "role": role,
                "parts": [{"text": msg.content}],
            })

        payload = {
            "contents": gemini_contents,
            "systemInstruction": {
                "parts": [{"text": system_instruction_text}]
            },
            "generationConfig": {
                "temperature": temperature,
                "maxOutputTokens": 2048,
            },
        }

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{chosen_model}:generateContent?key={key}"

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code != 200:
                err_detail = resp.text
                logger.error("Gemini API error (%d): %s", resp.status_code, err_detail)
                return ChatResponse(
                    content=f"Gemini API returned an error ({resp.status_code}): {resp.json().get('error', {}).get('message', err_detail)}",
                    provider="gemini",
                    model=chosen_model,
                )
            data = resp.json()
            try:
                reply_text = data["candidates"][0]["content"]["parts"][0]["text"]
            except (KeyError, IndexError):
                reply_text = "I received an empty response from Gemini."

            return ChatResponse(
                content=reply_text,
                provider="gemini",
                model=chosen_model,
                sources=sources if sources else None,
            )

    async def _call_openai(
        self,
        messages: List[ChatMessageSchema],
        model: Optional[str],
        client_key: Optional[str],
        sources: List[SearchResultItem],
        temperature: float,
    ) -> ChatResponse:
        key = client_key or self.settings.OPENAI_API_KEY
        chosen_model = model or "gpt-4o-mini"

        if not key:
            return ChatResponse(
                content="OpenAI API key is not configured. Please add your key in the Settings view.",
                provider="openai",
                model=chosen_model,
            )

        system_content = SYSTEM_PROMPT
        if sources:
            source_context = "\n\nReal-time Web Search Results:\n" + "\n".join(
                f"- [{s.title}] ({s.url}): {s.snippet}" for s in sources
            )
            system_content += source_context

        openai_messages = [{"role": "system", "content": system_content}]
        for m in messages:
            openai_messages.append({"role": m.role, "content": m.content})

        headers = {
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": chosen_model,
            "messages": openai_messages,
            "temperature": temperature,
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post("https://api.openai.com/v1/chat/completions", headers=headers, json=payload)
            if resp.status_code != 200:
                err_msg = resp.text
                return ChatResponse(
                    content=f"OpenAI error ({resp.status_code}): {err_msg}",
                    provider="openai",
                    model=chosen_model,
                )
            data = resp.json()
            content = data["choices"][0]["message"]["content"]
            return ChatResponse(
                content=content,
                provider="openai",
                model=chosen_model,
                sources=sources if sources else None,
            )

    async def _call_claude(
        self,
        messages: List[ChatMessageSchema],
        model: Optional[str],
        client_key: Optional[str],
        sources: List[SearchResultItem],
        temperature: float,
    ) -> ChatResponse:
        key = client_key or self.settings.ANTHROPIC_API_KEY
        chosen_model = model or "claude-3-5-sonnet-20241022"

        if not key:
            return ChatResponse(
                content="Anthropic API key is not configured. Please add your key in the Settings view.",
                provider="claude",
                model=chosen_model,
            )

        system_content = SYSTEM_PROMPT
        if sources:
            system_content += "\n\nWeb Search Results:\n" + "\n".join(
                f"- [{s.title}] ({s.url}): {s.snippet}" for s in sources
            )

        claude_messages = [
            {"role": "user" if m.role == "user" else "assistant", "content": m.content}
            for m in messages if m.role != "system"
        ]

        headers = {
            "x-api-key": key,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
        }
        payload = {
            "model": chosen_model,
            "system": system_content,
            "messages": claude_messages,
            "max_tokens": 2048,
            "temperature": temperature,
        }

        async with httpx.AsyncClient(timeout=35.0) as client:
            resp = await client.post("https://api.anthropic.com/v1/messages", headers=headers, json=payload)
            if resp.status_code != 200:
                return ChatResponse(
                    content=f"Anthropic error ({resp.status_code}): {resp.text}",
                    provider="claude",
                    model=chosen_model,
                )
            data = resp.json()
            reply_text = data["content"][0]["text"]
            return ChatResponse(
                content=reply_text,
                provider="claude",
                model=chosen_model,
                sources=sources if sources else None,
            )


_ai_service = AIService()


def get_ai_service() -> AIService:
    return _ai_service
