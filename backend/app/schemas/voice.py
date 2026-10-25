"""Request and response models for LiveKit voice sessions and health."""
from typing import Literal

from pydantic import BaseModel, Field


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
    livekit: bool
    version: str = "1.0.0"
