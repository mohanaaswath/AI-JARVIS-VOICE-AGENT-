"""
permission_service.py — Centralized permission and action-safety policy engine.
Enforces 4-tier risk classification, approval lifecycles, replay protection,
and strict parameter validation.
"""
import logging
import time
import uuid
from typing import Any
from app.schemas.actions import RiskLevel, ApprovalRequest

logger = logging.getLogger(__name__)


class PermissionService:
    # ── Action risk classifications ───────────────────────────────────────────
    ACTION_RISK_MAP: dict[str, RiskLevel] = {
        # Level 1: Read-only metrics & information
        "get_system_status": RiskLevel.LEVEL_1_READONLY,
        "get_audio_status": RiskLevel.LEVEL_1_READONLY,
        "get_battery_status": RiskLevel.LEVEL_1_READONLY,
        "get_memory_usage": RiskLevel.LEVEL_1_READONLY,
        "get_network_status": RiskLevel.LEVEL_1_READONLY,
        "get_display_settings": RiskLevel.LEVEL_1_READONLY,
        "read_allowed_file": RiskLevel.LEVEL_1_READONLY,
        "list_allowed_files": RiskLevel.LEVEL_1_READONLY,
        "get_execution_status": RiskLevel.LEVEL_1_READONLY,

        # Level 2: Low-risk, reversible actions
        "open_settings_page": RiskLevel.LEVEL_2_LOW_RISK,
        "open_application": RiskLevel.LEVEL_2_LOW_RISK,
        "set_master_volume": RiskLevel.LEVEL_2_LOW_RISK,
        "set_dark_mode": RiskLevel.LEVEL_2_LOW_RISK,
        "open_allowed_folder": RiskLevel.LEVEL_2_LOW_RISK,
        "open_website": RiskLevel.LEVEL_1_READONLY,
        "search_allowed_files": RiskLevel.LEVEL_1_READONLY,
        "create_allowed_folder": RiskLevel.LEVEL_3_SENSITIVE,
        "create_allowed_file": RiskLevel.LEVEL_3_SENSITIVE,
        "rename_allowed_file": RiskLevel.LEVEL_3_SENSITIVE,
        "copy_allowed_file": RiskLevel.LEVEL_3_SENSITIVE,

        # Level 3: Sensitive or disruptive actions (require explicit user approval)
        "change_bluetooth_state": RiskLevel.LEVEL_3_SENSITIVE,
        "modify_network_settings": RiskLevel.LEVEL_3_SENSITIVE,
        "move_files": RiskLevel.LEVEL_3_SENSITIVE,
        "edit_configuration": RiskLevel.LEVEL_3_SENSITIVE,

        # Level 4: High-impact operations (require dedicated approval or restricted)
        "delete_file": RiskLevel.LEVEL_4_HIGH_IMPACT,
        "run_shell_command": RiskLevel.LEVEL_4_HIGH_IMPACT,
        "system_shutdown": RiskLevel.LEVEL_4_HIGH_IMPACT,
        "system_restart": RiskLevel.LEVEL_4_HIGH_IMPACT,
    }

    def __init__(self, default_approval_ttl: int = 120):
        self._default_ttl = default_approval_ttl
        self._pending_approvals: dict[str, ApprovalRequest] = {}
        self._consumed_approvals: set[str] = set()

    def get_risk_level(self, action_name: str) -> RiskLevel:
        return self.ACTION_RISK_MAP.get(action_name, RiskLevel.LEVEL_3_SENSITIVE)

    def check_permission(
        self,
        action_name: str,
        parameters: dict[str, Any],
        approval_id: str | None = None,
    ) -> tuple[bool, str, RiskLevel, ApprovalRequest | None]:
        """
        Validates whether an action can execute under current policy.
        Returns:
            (allowed: bool, reason: str, risk_level: RiskLevel, pending_approval: ApprovalRequest | None)
        """
        self.cleanup_expired()
        risk_level = self.get_risk_level(action_name)

        # Level 1 (Read-only) and Level 2 (Low-risk reversible): allow direct execution
        if risk_level in (RiskLevel.LEVEL_1_READONLY, RiskLevel.LEVEL_2_LOW_RISK):
            return True, f"Action authorized under {risk_level.name}.", risk_level, None

        # Level 3 & Level 4: require valid, unconsumed approval bound to this action & arguments
        if not approval_id:
            approval = self.create_approval(
                action_name=action_name,
                parameters=parameters,
                description=f"Action '{action_name}' requires explicit user confirmation.",
            )
            return (
                False,
                f"Action '{action_name}' has risk level {risk_level.name}. User approval required.",
                risk_level,
                approval,
            )

        # Check if approval exists and is approved
        if approval_id in self._consumed_approvals:
            return False, "Approval token has already been consumed (replay rejected).", risk_level, None

        approval = self._pending_approvals.get(approval_id)
        if not approval:
            return False, "Approval request not found.", risk_level, None

        if time.time() > approval.expires_at:
            approval.status = "expired"
            return False, "Approval request has expired.", risk_level, None

        if approval.status == "rejected":
            return False, "Approval request was rejected by user.", risk_level, None

        if approval.status != "approved":
            return False, f"Approval request is still {approval.status}.", risk_level, approval

        # Verify the approval was granted for this exact action and parameters
        if approval.action_name != action_name:
            return False, f"Approval mismatch: token was created for '{approval.action_name}', not '{action_name}'.", risk_level, None

        if approval.parameters != parameters:
            return False, "Approval mismatch: parameters have been altered.", risk_level, None

        # Consume the approval to prevent replay
        self.consume_approval(approval_id)
        return True, "Action approved by operator.", risk_level, None

    def create_approval(
        self,
        action_name: str,
        parameters: dict[str, Any],
        description: str,
        ttl_seconds: int | None = None,
    ) -> ApprovalRequest:
        ttl = ttl_seconds or self._default_ttl
        approval_id = f"appr-{uuid.uuid4().hex[:12]}"
        now = time.time()
        req = ApprovalRequest(
            approval_id=approval_id,
            action_name=action_name,
            risk_level=self.get_risk_level(action_name),
            parameters=parameters,
            description=description,
            created_at=now,
            expires_at=now + ttl,
            status="pending",
        )
        self._pending_approvals[approval_id] = req
        logger.info("Created approval %s for action %s (expires in %ds)", approval_id, action_name, ttl)
        return req

    def approve(self, approval_id: str) -> bool:
        self.cleanup_expired()
        approval = self._pending_approvals.get(approval_id)
        if not approval:
            return False
        if time.time() > approval.expires_at:
            approval.status = "expired"
            return False
        approval.status = "approved"
        logger.info("Approval %s APPROVED", approval_id)
        return True

    def reject(self, approval_id: str, reason: str | None = None) -> bool:
        approval = self._pending_approvals.get(approval_id)
        if not approval:
            return False
        approval.status = "rejected"
        logger.info("Approval %s REJECTED: %s", approval_id, reason or "by operator")
        return True

    def consume_approval(self, approval_id: str) -> None:
        if approval_id in self._pending_approvals:
            self._pending_approvals[approval_id].status = "approved"
            self._consumed_approvals.add(approval_id)

    def get_pending_approvals(self) -> list[ApprovalRequest]:
        self.cleanup_expired()
        return [
            req for req in self._pending_approvals.values()
            if req.status == "pending" and req.approval_id not in self._consumed_approvals
        ]

    def get_approval(self, approval_id: str) -> ApprovalRequest | None:
        self.cleanup_expired()
        return self._pending_approvals.get(approval_id)

    def cleanup_expired(self) -> None:
        now = time.time()
        for req in self._pending_approvals.values():
            if req.status == "pending" and now > req.expires_at:
                req.status = "expired"
