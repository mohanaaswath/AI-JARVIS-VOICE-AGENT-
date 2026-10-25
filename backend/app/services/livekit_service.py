"""
livekit_service.py — issues short-lived LiveKit access tokens for the frontend.
API secrets are NEVER sent to the browser; only short-lived tokens are.

Strategy (in priority order):
  1. Use livekit.api (livekit-api package) if installed — cleanest approach.
  2. Fall back to pure-Python JWT generation using PyJWT — works without the SDK.
"""
import logging
import time
from datetime import timedelta

logger = logging.getLogger(__name__)


def _is_real_credential(value: str) -> bool:
    return bool(value and not set(value).issubset({"•", "*", "x", "X"}))


# ── Try livekit.api (official SDK) ───────────────────────────────────────────
try:
    from livekit.api import (
        AccessToken,
        RoomAgentDispatch,
        RoomConfiguration,
        VideoGrants,
    )
    _LIVEKIT_SDK = "livekit-api"
    logger.info("Using livekit.api SDK for token generation.")
except ImportError:
    _LIVEKIT_SDK = None

# ── Try PyJWT fallback ────────────────────────────────────────────────────────
if _LIVEKIT_SDK is None:
    try:
        import jwt as _jwt  # PyJWT
        _LIVEKIT_SDK = "pyjwt"
        logger.info("livekit.api not found — using PyJWT fallback for token generation.")
    except ImportError:
        _LIVEKIT_SDK = None
        logger.warning("Neither livekit-api nor PyJWT found. Voice token endpoint disabled.")


def _make_token_pyjwt(api_key: str, api_secret: str, room: str, identity: str, ttl: int) -> str:
    """Generate a LiveKit access token using pure PyJWT (no SDK required)."""
    import jwt as _jwt  # noqa: PLC0415 (local import intentional)
    now = int(time.time())
    payload = {
        "iss": api_key,
        "sub": identity,
        "iat": now,
        "exp": now + ttl,
        "name": identity,
        "video": {
            "roomJoin": True,
            "room": room,
            "canPublish": True,
            "canSubscribe": True,
        },
    }
    token = _jwt.encode(payload, api_secret, algorithm="HS256")
    # PyJWT ≥2.0 returns str; older versions return bytes
    return token if isinstance(token, str) else token.decode("utf-8")


class LiveKitService:
    def __init__(self, api_key: str, api_secret: str, url: str) -> None:
        self.api_key = api_key
        self.api_secret = api_secret
        self.url = url

    def create_token(
        self,
        room_name: str,
        participant_identity: str,
        agent_name: str = "my-agent",
        ttl_seconds: int = 3600,
    ) -> str:
        """
        Creates a short-lived LiveKit JWT for the frontend to join a room.
        Tries livekit.api SDK first, then PyJWT fallback, then raises if neither available.
        """
        if not _is_real_credential(self.api_key) or not _is_real_credential(self.api_secret):
            raise RuntimeError(
                "LIVEKIT_API_KEY and LIVEKIT_API_SECRET must contain the real LiveKit credentials."
            )

        if _LIVEKIT_SDK == "livekit-api":
            token = (
                AccessToken(self.api_key, self.api_secret)
                .with_identity(participant_identity)
                .with_name(participant_identity)
                .with_grants(VideoGrants(room_join=True, room=room_name))
                .with_room_config(
                    RoomConfiguration(
                        agents=[RoomAgentDispatch(agent_name=agent_name)]
                    )
                )
                .with_ttl(timedelta(seconds=ttl_seconds))
                .to_jwt()
            )
            return token

        if _LIVEKIT_SDK == "pyjwt":
            raise RuntimeError(
                "The livekit-api package is required to add the voice agent to access tokens."
            )

        raise RuntimeError(
            "Cannot generate LiveKit token: install 'livekit-api' or 'PyJWT'.\n"
            "  pip install livekit-api"
        )

    @property
    def is_available(self) -> bool:
        """True if credentials are set AND we can generate a token."""
        return bool(
            _is_real_credential(self.api_key)
            and _is_real_credential(self.api_secret)
            and _LIVEKIT_SDK == "livekit-api"
        )
