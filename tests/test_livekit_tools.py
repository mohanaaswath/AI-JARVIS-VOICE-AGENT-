"""
Unit tests for LiveKit tool registration, schema integrity, and compatibility.
"""
import unittest
from tools import ALL_JARVIS_TOOLS


class TestLiveKitToolRegistration(unittest.TestCase):
    def test_all_tools_exported(self):
        self.assertGreaterEqual(len(ALL_JARVIS_TOOLS), 10)

    def test_tool_signatures_and_docstrings(self):
        required_tools = [
            "get_system_status",
            "get_audio_status",
            "set_master_volume",
            "get_display_settings",
            "set_dark_mode",
            "open_settings_page",
            "open_application",
            "get_battery_status",
            "get_memory_usage",
            "get_network_status",
            "open_allowed_folder",
            "read_allowed_file",
            "list_allowed_files",
            "get_execution_status",
        ]
        registered_names = [t.info.name for t in ALL_JARVIS_TOOLS]
        for name in required_tools:
            self.assertIn(name, registered_names, f"Tool '{name}' is missing from ALL_JARVIS_TOOLS")

    def test_tool_docstrings_present(self):
        for t in ALL_JARVIS_TOOLS:
            self.assertTrue(
                bool(t.info.description),
                f"Tool '{t.info.name}' is missing a description/docstring"
            )


if __name__ == "__main__":
    unittest.main()
