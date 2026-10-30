"""
Unit tests for application launching and argument safety.
"""
import unittest
from unittest.mock import patch, MagicMock
from app.services.system_service import SystemService
from app.schemas.actions import ActionStatus


class TestApplicationLaunching(unittest.TestCase):
    def setUp(self):
        self.svc = SystemService()

    def test_allowlisted_apps_exist(self):
        expected_apps = ["notepad", "calculator", "calc", "chrome", "vscode", "explorer"]
        for app in expected_apps:
            self.assertIn(app, self.svc.APPLICATION_ALLOWLIST)

    def test_non_allowlisted_app_rejected(self):
        res = self.svc.open_application("malicious_malware.exe")
        self.assertEqual(res.status, ActionStatus.FAILED)
        self.assertEqual(res.error_code, "APP_NOT_ALLOWLISTED")

    def test_command_injection_rejected(self):
        res = self.svc.open_application("notepad & whoami")
        self.assertEqual(res.status, ActionStatus.FAILED)
        self.assertEqual(res.error_code, "APP_NOT_ALLOWLISTED")

    def test_invalid_website_rejected(self):
        res = self.svc.open_website("javascript:alert(1)")
        self.assertEqual(res.status, ActionStatus.FAILED)
        self.assertEqual(res.error_code, "INVALID_WEBSITE_URL")

    @patch("app.services.system_service.webbrowser.open_new_tab")
    def test_website_alias_opens_valid_url(self, mock_open):
        mock_open.return_value = True
        res = self.svc.open_website("YouTube")
        self.assertEqual(res.status, ActionStatus.SUCCESS)
        mock_open.assert_called_once_with("https://www.youtube.com")

    @patch("app.services.system_service.subprocess.Popen")
    @patch("app.services.system_service.VerificationService.verify_application_spawned")
    def test_allowed_app_launch_subprocess(self, mock_verify, mock_popen):
        mock_proc = MagicMock()
        mock_proc.pid = 12345
        mock_popen.return_value = mock_proc
        mock_verify.return_value = "verified"

        res = self.svc.open_application("notepad")
        self.assertEqual(res.status, ActionStatus.SUCCESS)
        mock_popen.assert_called_once_with(["notepad.exe"], shell=False)


if __name__ == "__main__":
    unittest.main()
