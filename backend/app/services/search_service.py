import re
import urllib.parse
import logging
from typing import List
import httpx
from app.schemas.chat import SearchResultItem

logger = logging.getLogger(__name__)


class SearchService:
    @staticmethod
    async def search(query: str, limit: int = 5) -> List[SearchResultItem]:
        results: List[SearchResultItem] = []
        clean_query = query.strip()
        if not clean_query:
            return results

        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        }

        try:
            async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
                # First try DuckDuckGo Instant Answers API
                ia_url = f"https://api.duckduckgo.com/?q={urllib.parse.quote(clean_query)}&format=json&no_html=1&skip_disambig=1"
                try:
                    ia_resp = await client.get(ia_url, headers=headers)
                    if ia_resp.status_code == 200:
                        data = ia_resp.json()
                        if data.get("AbstractText"):
                            results.append(
                                SearchResultItem(
                                    title=data.get("Heading") or clean_query,
                                    snippet=data["AbstractText"],
                                    url=data.get("AbstractURL") or "https://duckduckgo.com",
                                )
                            )
                        # Related topics
                        for topic in data.get("RelatedTopics", []):
                            if len(results) >= limit:
                                break
                            if isinstance(topic, dict) and topic.get("Text") and topic.get("FirstURL"):
                                results.append(
                                    SearchResultItem(
                                        title=topic["Text"][:60] + "...",
                                        snippet=topic["Text"],
                                        url=topic["FirstURL"],
                                    )
                                )
                except Exception as e:
                    logger.debug("Instant answer lookup exception: %s", e)

                # If no instant results or need more, query DuckDuckGo HTML
                if len(results) < limit:
                    html_url = f"https://html.duckduckgo.com/html/?q={urllib.parse.quote(clean_query)}"
                    resp = await client.get(html_url, headers=headers)
                    if resp.status_code == 200:
                        html = resp.text
                        # Match result blocks: class="result__title">...<a class="result__snippet" ...
                        # DuckDuckGo HTML layout regex:
                        items = re.findall(
                            r'<a class="result__url"[^>]*href="([^"]+)"[^>]*>.*?</a>.*?<a class="result__snippet"[^>]*>(.*?)</a>',
                            html,
                            re.DOTALL,
                        )
                        if not items:
                            # Alternative regex for duckduckgo html
                            links = re.findall(r'<a class="result__snippet[^"]*"[^>]*href="([^"]+)"[^>]*>(.*?)</a>', html, re.DOTALL)
                            if links:
                                items = links

                        for u, s in items:
                            if len(results) >= limit:
                                break
                            clean_s = re.sub(r"<[^>]+>", "", s).strip()
                            # decode uddg parameter if present
                            if "uddg=" in u:
                                match = re.search(r"uddg=([^&]+)", u)
                                if match:
                                    u = urllib.parse.unquote(match.group(1))
                            if clean_s and u.startswith("http"):
                                results.append(
                                    SearchResultItem(
                                        title=clean_s[:50] + ("..." if len(clean_s) > 50 else ""),
                                        snippet=clean_s,
                                        url=u,
                                    )
                                )

        except Exception as exc:
            logger.warning("Search request failed for '%s': %s", clean_query, exc)

        return results[:limit]


_search_service = SearchService()


def get_search_service() -> SearchService:
    return _search_service
