"""
schemas/chat.py — Pydantic request/response models for the chat API.
"""
from pydantic import BaseModel, Field
from typing import Literal


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=8000, description="User message text")
    session_id: str | None = Field(None, description="Optional session ID for conversation continuity")


class ChatResponse(BaseModel):
    reply: str
    session_id: str | None = None


class TokenRequest(BaseModel):
    room_name: str = Field(..., min_length=1, max_length=100)
    participant_identity: str = Field(..., min_length=1, max_length=100)


class TokenResponse(BaseModel):
    token: str
    url: str
    room_name: str
    participant_identity: str


class HealthResponse(BaseModel):
    status: Literal["ok", "degraded"]
    google_ai: bool
    livekit: bool
    version: str = "1.0.0"


class ErrorResponse(BaseModel):
    detail: str
    code: str | None = None
