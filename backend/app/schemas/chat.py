from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class ChatMessageSchema(BaseModel):
    role: str = Field(..., description="Role: user, assistant, or system")
    content: str = Field(..., description="Message text content")


class ChatRequest(BaseModel):
    messages: List[ChatMessageSchema] = Field(..., description="Conversation history")
    provider: Optional[str] = Field("gemini", description="AI provider: gemini, openai, claude")
    model: Optional[str] = Field(None, description="Specific model ID")
    api_key: Optional[str] = Field(None, description="Client-provided API key (optional)")
    web_search: Optional[bool] = Field(False, description="Whether to perform web search")
    temperature: Optional[float] = Field(0.7, ge=0.0, le=2.0)


class SearchResultItem(BaseModel):
    title: str
    snippet: str
    url: str


class ChatResponse(BaseModel):
    role: str = "assistant"
    content: str
    provider: str
    model: str
    sources: Optional[List[SearchResultItem]] = None


class SearchQuery(BaseModel):
    query: str
    limit: Optional[int] = 5


class SearchResponse(BaseModel):
    query: str
    results: List[SearchResultItem]
