"""
Unit tests for Windows volume control and verification.
Uses mocks to avoid altering laptop volume during automated test runs.
"""
import unittest
from unittest.mock import patch, MagicMock
from app.services.system_service import SystemService
from app.services.verification_service import VerificationService
from app.schemas.actions import ActionStatus, VerificationStatus


class TestVolumeControl(unittest.TestCase):
    def setUp(self):
        self.svc = SystemService()

    def test_invalid_volume_types(self):
        res = self.svc.set_master_volume("loud")
        self.assertEqual(res.status, ActionStatus.FAILED)
        self.assertEqual(res.error_code, "INVALID_ARGUMENT")

        res_none = self.svc.set_master_volume(None)
        self.assertEqual(res_none.status, ActionStatus.FAILED)
        self.assertEqual(res_none.error_code, "INVALID_ARGUMENT")

    def test_out_of_range_volume(self):
        res_neg = self.svc.set_master_volume(-5)
        self.assertEqual(res_neg.status, ActionStatus.FAILED)
        self.assertEqual(res_neg.error_code, "OUT_OF_RANGE")

        res_high = self.svc.set_master_volume(105)
        self.assertEqual(res_high.status, ActionStatus.FAILED)
        self.assertEqual(res_high.error_code, "OUT_OF_RANGE")

    @patch("app.services.system_service.ctypes")
    def test_valid_volume_success_and_verification(self, mock_ctypes):
        mock_winmm = MagicMock()
        mock_winmm.waveOutSetVolume.return_value = 0
        mock_ctypes.windll.winmm = mock_winmm

        # Mock read-back
        with patch.object(self.svc, "get_audio_status") as mock_read:
            from app.schemas.system import AudioInfo
            mock_read.return_value = AudioInfo(master_volume=40, is_muted=False)

            res = self.svc.set_master_volume(40)
            self.assertEqual(res.status, ActionStatus.SUCCESS)
            self.assertEqual(res.verification_status, VerificationStatus.VERIFIED)
            self.assertEqual(res.requested_value, 40)
            self.assertEqual(res.observed_value, 40)

    @patch("app.services.system_service.ctypes")
    def test_volume_verification_failure(self, mock_ctypes):
        mock_winmm = MagicMock()
        mock_winmm.waveOutSetVolume.return_value = 0
        mock_ctypes.windll.winmm = mock_winmm

        # Mock read-back returning an unexpected volume level
        with patch.object(self.svc, "get_audio_status") as mock_read:
            from app.schemas.system import AudioInfo
            mock_read.return_value = AudioInfo(master_volume=10, is_muted=False)

            res = self.svc.set_master_volume(70)
            self.assertEqual(res.status, ActionStatus.FAILED)
            self.assertEqual(res.verification_status, VerificationStatus.FAILED)

    def test_verification_service_tolerance(self):
        # Within tolerance (<= 5%)
        self.assertEqual(
            VerificationService.verify_volume(50, 52, tolerance=5),
            VerificationStatus.VERIFIED
        )
        self.assertEqual(
            VerificationService.verify_volume(50, 46, tolerance=5),
            VerificationStatus.VERIFIED
        )
        # Outside tolerance (> 5%)
        self.assertEqual(
            VerificationService.verify_volume(50, 60, tolerance=5),
            VerificationStatus.FAILED
        )
        # None observed
        self.assertEqual(
            VerificationService.verify_volume(50, None),
            VerificationStatus.UNVERIFIED
        )


if __name__ == "__main__":
    unittest.main()
