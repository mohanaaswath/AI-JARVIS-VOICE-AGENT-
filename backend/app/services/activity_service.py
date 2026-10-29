"""
activity_service.py — In-memory log of executed assistant operations,
verification outcomes, and audit trail for the frontend dashboard.
"""
import logging
from collections import deque
from threading import Lock
from app.schemas.actions import ActionResult

logger = logging.getLogger(__name__)


class ActivityService:
    def __init__(self, max_history: int = 200):
        self._max_history = max_history
        self._history: deque[ActionResult] = deque(maxlen=max_history)
        self._by_id: dict[str, ActionResult] = {}
        self._lock = Lock()

    def record_action(self, result: ActionResult) -> ActionResult:
        with self._lock:
            self._history.appendleft(result)
            self._by_id[result.action_id] = result
            # Ensure _by_id doesn't grow unbounded beyond 2x max_history
            if len(self._by_id) > self._max_history * 2:
                recent_ids = {item.action_id for item in self._history}
                self._by_id = {k: v for k, v in self._by_id.items() if k in recent_ids}
        logger.info(
            "Activity logged: %s (%s) -> %s [%s]",
            result.action_name,
            result.action_id,
            result.status.value,
            result.verification_status.value,
        )
        return result

    def get_activities(self, limit: int = 50) -> list[ActionResult]:
        with self._lock:
            return list(self._history)[:limit]

    def get_activity_by_id(self, action_id: str) -> ActionResult | None:
        with self._lock:
            return self._by_id.get(action_id)

    def clear(self) -> None:
        with self._lock:
            self._history.clear()
            self._by_id.clear()
