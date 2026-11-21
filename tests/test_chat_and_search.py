import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_search_endpoint_empty():
    response = client.get("/api/search?q=")
    assert response.status_code == 200
    data = response.json()
    assert data["query"] == ""
    assert data["results"] == []


def test_chat_endpoint_unconfigured():
    # Calling chat without API key returns clear guidance message
    response = client.post(
        "/api/chat",
        json={
            "messages": [{"role": "user", "content": "Hello Jarvis"}],
            "provider": "gemini",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "content" in data
    assert data["provider"] == "gemini"


def test_chat_endpoint_validation():
    # Missing messages field
    response = client.post("/api/chat", json={})
    assert response.status_code == 422
