"""
verification_service.py — Independent verification engine for system operations.
Inspects real Windows state post-execution and guarantees honest reporting.
"""
import logging
from app.schemas.actions import VerificationStatus

logger = logging.getLogger(__name__)


class VerificationService:
    @staticmethod
    def verify_volume(
        requested: int,
        observed: int | None,
        tolerance: int = 5,
    ) -> VerificationStatus:
        """
        Compares observed volume against target volume.
        Windows sound hardware steps can vary slightly, so a small tolerance (e.g. 5%) is allowed.
        """
        if observed is None:
            return VerificationStatus.UNVERIFIED
        diff = abs(int(requested) - int(observed))
        if diff <= tolerance:
            return VerificationStatus.VERIFIED
        logger.warning(
            "Volume verification mismatch: requested %s%%, observed %s%% (diff %s > %s)",
            requested,
            observed,
            diff,
            tolerance,
        )
        return VerificationStatus.FAILED

    @staticmethod
    def verify_dark_mode(
        requested_dark: bool,
        observed_apps_use_light: int | None,
        observed_system_uses_light: int | None,
    ) -> VerificationStatus:
        if observed_apps_use_light is None:
            return VerificationStatus.UNVERIFIED
        expected_val = 0 if requested_dark else 1
        if observed_apps_use_light == expected_val:
            return VerificationStatus.VERIFIED
        logger.warning(
            "Dark mode verification mismatch: requested dark=%s, observed AppsUseLightTheme=%s",
            requested_dark,
            observed_apps_use_light,
        )
        return VerificationStatus.FAILED

    @staticmethod
    def verify_application_spawned(
        process_name: str,
        launched_pid: int | None = None,
    ) -> VerificationStatus:
        """
        Checks whether the application process exists and is active.
        """
        try:
            import psutil
            if launched_pid:
                try:
                    p = psutil.Process(launched_pid)
                    if p.is_running():
                        return VerificationStatus.VERIFIED
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    pass

            target = process_name.lower().replace(".exe", "")
            for proc in psutil.process_iter(["name"]):
                try:
                    p_name = (proc.info["name"] or "").lower().replace(".exe", "")
                    if target in p_name:
                        return VerificationStatus.VERIFIED
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue
        except Exception as exc:
            logger.debug("Process verification exception: %s", exc)
        return VerificationStatus.UNVERIFIED
