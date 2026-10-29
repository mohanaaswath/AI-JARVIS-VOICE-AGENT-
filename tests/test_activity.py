"""
Unit tests for the ActivityService audit logger.
"""
import unittest
from app.services.activity_service import ActivityService
from app.schemas.actions import ActionResult, ActionStatus, VerificationStatus


class TestActivityService(unittest.TestCase):
    def setUp(self):
        self.svc = ActivityService(max_history=5)

    def test_record_and_retrieve(self):
        res = ActionResult(
            action_id="act-1",
            action_name="test_action",
            status=ActionStatus.SUCCESS,
            verification_status=VerificationStatus.VERIFIED,
            message="All good",
        )
        self.svc.record_action(res)
        items = self.svc.get_activities()
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0].action_id, "act-1")

        found = self.svc.get_activity_by_id("act-1")
        self.assertIsNotNone(found)
        self.assertEqual(found.action_name, "test_action")

    def test_bounded_history(self):
        for i in range(10):
            self.svc.record_action(ActionResult(
                action_id=f"act-{i}",
                action_name=f"action_{i}",
                status=ActionStatus.SUCCESS,
            ))
        items = self.svc.get_activities()
        self.assertEqual(len(items), 5)
        # Latest first
        self.assertEqual(items[0].action_id, "act-9")


if __name__ == "__main__":
    unittest.main()
