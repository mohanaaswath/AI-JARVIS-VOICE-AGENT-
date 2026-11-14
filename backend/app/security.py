"""Shared API authentication and production transport security."""
from __future__ import annotations

import hmac

from fastapi import Header, HTTPException, Request

from app.config import get_settings


def is_loopback(request: Request) -> bool:
    host = request.client.host if request.client else None
    return host in {"127.0.0.1", "::1", "localhost", "testclient"}


async def require_api_auth(
    request: Request,
    authorization: str | None = Header(default=None),
) -> None:
    """Allow loopback use without a key; require a bearer token remotely."""
    settings = get_settings()
    expected = settings.API_AUTH_TOKEN
    if not expected:
        if settings.APP_ENV == "production":
            raise HTTPException(status_code=503, detail="API authentication is not configured.")
        if is_loopback(request):
            return
        raise HTTPException(status_code=503, detail="Remote API authentication is not configured.")

    scheme, _, supplied = (authorization or "").partition(" ")
    if scheme.lower() != "bearer" or not hmac.compare_digest(supplied, expected):
        raise HTTPException(
            status_code=401,
            detail="A valid API bearer token is required.",
            headers={"WWW-Authenticate": "Bearer"},
        )
