"""
Unit tests for API request/response schemas, validation, and route handlers.
"""
import unittest
from app.schemas.actions import (
    ActionResult,
    ActionStatus,
    VerificationStatus,
    ApprovalRequest,
    ExecuteActionRequest,
)
from app.schemas.system import (
    SystemStatusResponse,
    CpuInfo,
    MemoryInfo,
    BatteryInfo,
    AudioInfo,
    DisplayInfo,
)


class TestApiSchemas(unittest.TestCase):
    def test_action_result_schema(self):
        res = ActionResult(
            action_id="test-123",
            action_name="set_master_volume",
            status=ActionStatus.SUCCESS,
            verification_status=VerificationStatus.VERIFIED,
            message="Volume set to 30%",
            requested_value=30,
            observed_value=30,
        )
        self.assertEqual(res.status, ActionStatus.SUCCESS)
        self.assertEqual(res.verification_status, VerificationStatus.VERIFIED)

    def test_system_status_response_schema(self):
        resp = SystemStatusResponse(
            cpu=CpuInfo(percent=25.5, logical_cores=8),
            memory=MemoryInfo(total_mb=16384, used_mb=8192, available_mb=8192, percent=50.0),
            battery=BatteryInfo(available=True, percent=88.0, power_plugged=True),
            audio=AudioInfo(master_volume=50, is_muted=False),
            display=DisplayInfo(dark_mode_enabled=True),
        )
        self.assertEqual(resp.cpu.logical_cores, 8)
        self.assertTrue(resp.battery.available)
        self.assertTrue(resp.display.dark_mode_enabled)

    def test_execute_action_request_schema(self):
        req = ExecuteActionRequest(
            action_name="set_master_volume",
            parameters={"level": 75},
        )
        self.assertEqual(req.action_name, "set_master_volume")
        self.assertEqual(req.parameters["level"], 75)


if __name__ == "__main__":
    unittest.main()
