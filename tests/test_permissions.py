"""
Unit tests for the PermissionService risk engine and approval lifecycle.
"""
import unittest
import time
from app.services.permission_service import PermissionService
from app.schemas.actions import RiskLevel


class TestPermissionService(unittest.TestCase):
    def setUp(self):
        self.perm = PermissionService(default_approval_ttl=2)

    def test_level1_and_level2_auto_authorized(self):
        allowed1, _, risk1, appr1 = self.perm.check_permission("get_system_status", {})
        self.assertTrue(allowed1)
        self.assertEqual(risk1, RiskLevel.LEVEL_1_READONLY)
        self.assertIsNone(appr1)

        allowed2, _, risk2, appr2 = self.perm.check_permission("set_master_volume", {"level": 30})
        self.assertTrue(allowed2)
        self.assertEqual(risk2, RiskLevel.LEVEL_2_LOW_RISK)
        self.assertIsNone(appr2)

    def test_level3_requires_approval(self):
        allowed, reason, risk, appr = self.perm.check_permission("modify_network_settings", {"adapter": "Wi-Fi"})
        self.assertFalse(allowed)
        self.assertEqual(risk, RiskLevel.LEVEL_3_SENSITIVE)
        self.assertIsNotNone(appr)
        self.assertEqual(appr.status, "pending")

        # Operator approves
        ok = self.perm.approve(appr.approval_id)
        self.assertTrue(ok)

        # Retry with valid approval token
        allowed_retry, _, _, _ = self.perm.check_permission(
            "modify_network_settings",
            {"adapter": "Wi-Fi"},
            approval_id=appr.approval_id,
        )
        self.assertTrue(allowed_retry)

        # Replay attempt with same consumed approval token must fail
        replay_allowed, replay_reason, _, _ = self.perm.check_permission(
            "modify_network_settings",
            {"adapter": "Wi-Fi"},
            approval_id=appr.approval_id,
        )
        self.assertFalse(replay_allowed)
        self.assertIn("already been consumed", replay_reason)

    def test_parameter_tampering_rejected(self):
        _, _, _, appr = self.perm.check_permission("edit_configuration", {"key": "debug", "val": "true"})
        self.perm.approve(appr.approval_id)

        # Attempt to use the approval for altered arguments
        allowed, reason, _, _ = self.perm.check_permission(
            "edit_configuration",
            {"key": "password", "val": "hacked"},
            approval_id=appr.approval_id,
        )
        self.assertFalse(allowed)
        self.assertIn("parameters have been altered", reason)

    def test_rejection(self):
        _, _, _, appr = self.perm.check_permission("move_files", {"src": "a", "dst": "b"})
        self.perm.reject(appr.approval_id, reason="Operator denied")
        allowed, reason, _, _ = self.perm.check_permission("move_files", {"src": "a", "dst": "b"}, approval_id=appr.approval_id)
        self.assertFalse(allowed)
        self.assertIn("rejected", reason)

    def test_approval_expiration(self):
        _, _, _, appr = self.perm.check_permission("modify_network_settings", {"adapter": "Wi-Fi"})
        # Fast forward expiration
        appr.expires_at = time.time() - 1
        allowed, reason, _, _ = self.perm.check_permission("modify_network_settings", {"adapter": "Wi-Fi"}, approval_id=appr.approval_id)
        self.assertFalse(allowed)
        self.assertIn("expired", reason)


if __name__ == "__main__":
    unittest.main()
