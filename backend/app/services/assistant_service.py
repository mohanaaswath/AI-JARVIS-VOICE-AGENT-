"""
assistant_service.py — wraps Google GenAI (new SDK) for text-based chat.
Uses the same Agent_Instruction from prompt.py to keep one source of truth.
"""
import sys
import os
from typing import AsyncGenerator

# Make root project importable so we can reuse prompt.py
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from prompt import Agent_Instruction  # noqa: E402

try:
    from google import genai
    from google.genai import types as genai_types
    NEW_SDK = True
except ImportError:
    # Fall back to deprecated SDK if new one not installed yet
    import google.generativeai as genai  # type: ignore
    NEW_SDK = False


class AssistantService:
    """Thin wrapper around Gemini for text chat (uses google-genai new SDK)."""

    def __init__(self, api_key: str) -> None:
        if not api_key:
            raise ValueError("GOOGLE_API_KEY is not set.")
        self._api_key = api_key
        self._history: list[dict] = []

        if NEW_SDK:
            self._client = genai.Client(api_key=api_key)
        else:
            genai.configure(api_key=api_key)
            self._model = genai.GenerativeModel(  # type: ignore
                model_name="gemini-1.5-flash",
                system_instruction=Agent_Instruction,
            )
            self._chat = self._model.start_chat(history=[])

    async def chat(self, user_message: str) -> str:
        """Send a message and return the assistant reply (non-streaming)."""
        if NEW_SDK:
            self._history.append({"role": "user", "parts": [user_message]})
            response = self._client.models.generate_content(
                model="gemini-2.0-flash",
                contents=self._history,
                config=genai_types.GenerateContentConfig(
                    system_instruction=Agent_Instruction,
                    temperature=0.8,
                ),
            )
            reply = response.text or ""
            self._history.append({"role": "model", "parts": [reply]})
            return reply
        else:
            response = self._chat.send_message(user_message)  # type: ignore
            return response.text

    async def stream_chat(self, user_message: str) -> AsyncGenerator[str, None]:
        """Send a message and yield reply chunks for streaming."""
        if NEW_SDK:
            self._history.append({"role": "user", "parts": [user_message]})
            full_reply = ""
            for chunk in self._client.models.generate_content_stream(
                model="gemini-2.0-flash",
                contents=self._history,
                config=genai_types.GenerateContentConfig(
                    system_instruction=Agent_Instruction,
                    temperature=0.8,
                ),
            ):
                if chunk.text:
                    full_reply += chunk.text
                    yield chunk.text
            self._history.append({"role": "model", "parts": [full_reply]})
        else:
            response = self._chat.send_message(user_message, stream=True)  # type: ignore
            for chunk in response:
                if chunk.text:
                    yield chunk.text

    def reset(self) -> None:
        """Start a fresh conversation."""
        self._history = []
        if not NEW_SDK:
            self._chat = self._model.start_chat(history=[])  # type: ignore
