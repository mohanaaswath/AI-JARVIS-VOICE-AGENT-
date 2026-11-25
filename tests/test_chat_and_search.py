import unittest
from app.schemas.chat import ChatMessageSchema, ChatRequest, ChatResponse, SearchResponse, SearchResultItem
from app.services.ai_service import AIService


class TestChatAndSearchSchemas(unittest.TestCase):
    def test_search_schemas(self):
        item = SearchResultItem(
            title="JARVIS Assistant",
            snippet="A modern voice assistant",
            url="https://example.com",
        )
        resp = SearchResponse(query="jarvis", results=[item])
        self.assertEqual(resp.query, "jarvis")
        self.assertEqual(len(resp.results), 1)
        self.assertEqual(resp.results[0].title, "JARVIS Assistant")

    def test_chat_request_schema(self):
        req = ChatRequest(
            messages=[ChatMessageSchema(role="user", content="Hello Jarvis")],
            provider="gemini",
            web_search=True,
        )
        self.assertEqual(req.provider, "gemini")
        self.assertTrue(req.web_search)
        self.assertEqual(len(req.messages), 1)

    def test_chat_response_schema(self):
        resp = ChatResponse(
            content="Hello! How can I assist you?",
            provider="gemini",
            model="gemini-1.5-flash",
        )
        self.assertEqual(resp.role, "assistant")
        self.assertIn("Hello", resp.content)
