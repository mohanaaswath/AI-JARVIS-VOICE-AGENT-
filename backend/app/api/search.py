"""
search.py — Live real-time web search endpoint.
"""
import logging
from fastapi import APIRouter, Query, HTTPException
from app.schemas.chat import SearchResponse, SearchResultItem
from app.services.search_service import get_search_service

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Web Search"])


@router.get("/search", response_model=SearchResponse)
async def search_endpoint(
    q: str = Query(..., description="Search query string"),
    limit: int = Query(5, ge=1, le=10, description="Max results to return"),
) -> SearchResponse:
    """
    Perform a safe web search and return structured title, snippet, and URL items.
    """
    try:
        service = get_search_service()
        results = await service.search(query=q, limit=limit)
        return SearchResponse(query=q, results=results)
    except Exception as exc:
        logger.error("Search endpoint error: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Search failed: {exc}")
