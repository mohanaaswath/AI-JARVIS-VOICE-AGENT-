"""
Unit tests for safe file operations, root boundaries, and path traversal prevention.
"""
import unittest
from pathlib import Path
from app.services.system_service import SystemService
from app.schemas.actions import ActionStatus


class TestFileOperations(unittest.TestCase):
    def setUp(self):
        self.svc = SystemService()

    def test_path_outside_permitted_roots_rejected(self):
        bad_paths = [
            "C:\\Windows\\System32\\cmd.exe",
            "../../../../Windows/System32",
            "C:\\Program Files",
        ]
        for p in bad_paths:
            res = self.svc.read_allowed_file(p)
            self.assertEqual(res.status, ActionStatus.FAILED)
            self.assertEqual(res.error_code, "PATH_FORBIDDEN")

    def test_sensitive_files_rejected(self):
        sensitive = [
            ".env",
            "frontend/.env",
            "id_rsa",
            "secrets.json",
        ]
        for s in sensitive:
            res = self.svc.read_allowed_file(s)
            self.assertEqual(res.status, ActionStatus.FAILED)
            self.assertEqual(res.error_code, "PATH_FORBIDDEN")

    def test_read_allowed_project_file(self):
        # README.md is in the project root and is allowed
        res = self.svc.read_allowed_file("README.md")
        self.assertEqual(res.status, ActionStatus.SUCCESS)
        self.assertIn("JARVIS", res.parameters.get("content", ""))

    def test_list_allowed_files(self):
        res = self.svc.list_allowed_files("")
        self.assertEqual(res.status, ActionStatus.SUCCESS)
        self.assertTrue(res.observed_value > 0)


if __name__ == "__main__":
    unittest.main()
