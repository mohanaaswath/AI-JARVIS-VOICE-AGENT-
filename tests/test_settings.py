"""
Unit tests for Windows Settings page allowlisting and safe launching.
"""
import unittest
from unittest.mock import patch
from app.services.system_service import SystemService
from app.schemas.actions import ActionStatus, VerificationStatus


class TestSettingsPageLaunching(unittest.TestCase):
    def setUp(self):
        self.svc = SystemService()

    def test_allowlisted_pages_mapping(self):
        expected = {
            "bluetooth": "ms-settings:bluetooth",
            "sound": "ms-settings:sound",
            "display": "ms-settings:display",
            "wifi": "ms-settings:network-wifi",
            "windowsupdate": "ms-settings:windowsupdate",
            "power": "ms-settings:powersleep",
        }
        for page, uri in expected.items():
            self.assertIn(page, self.svc.SETTINGS_ALLOWLIST)
            self.assertEqual(self.svc.SETTINGS_ALLOWLIST[page], uri)

    def test_unsupported_page_rejected(self):
        res = self.svc.open_settings_page("arbitrary_hacker_uri")
        self.assertEqual(res.status, ActionStatus.FAILED)
        self.assertEqual(res.error_code, "UNSUPPORTED_SETTINGS_PAGE")

    @patch("app.services.system_service.os.startfile", create=True)
    def test_successful_settings_launch(self, mock_startfile):
        res = self.svc.open_settings_page("bluetooth")
        self.assertEqual(res.status, ActionStatus.SUCCESS)
        self.assertEqual(res.verification_status, VerificationStatus.VERIFIED)
        mock_startfile.assert_called_once_with("ms-settings:bluetooth")


if __name__ == "__main__":
    unittest.main()
