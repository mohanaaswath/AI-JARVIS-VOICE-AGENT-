from typing import Literal

from pydantic import BaseModel, Field


class AgentSettingsUpdate(BaseModel):
    wake_word_enabled: bool | None = None
    microphone_muted: bool | None = None
    wake_word_sensitivity: float | None = Field(default=None, ge=0.0, le=1.0)
    conversation_mode: Literal["single", "continuous"] | None = None
    inactivity_timeout_seconds: int | None = Field(default=None, ge=5, le=600)
