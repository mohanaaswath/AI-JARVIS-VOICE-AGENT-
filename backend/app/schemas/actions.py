"""
actions.py — Pydantic schemas for Windows assistant actions, verification, and approvals.
"""
from enum import Enum
from typing import Any, Literal
import time
from pydantic import BaseModel, Field


class RiskLevel(int, Enum):
    LEVEL_1_READONLY = 1
    LEVEL_2_LOW_RISK = 2
    LEVEL_3_SENSITIVE = 3
    LEVEL_4_HIGH_IMPACT = 4


class ActionStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    EXECUTING = "executing"
    SUCCESS = "success"
    FAILED = "failed"
    TIMEOUT = "timeout"
    CANCELLED = "cancelled"


class VerificationStatus(str, Enum):
    VERIFIED = "verified"
    UNVERIFIED = "unverified"
    FAILED = "failed"
    NOT_APPLICABLE = "not_applicable"


class ActionResult(BaseModel):
    action_id: str
    action_name: str
    risk_level: int = 1
    status: ActionStatus = ActionStatus.SUCCESS
    requested_value: Any = None
    observed_value: Any = None
    verification_status: VerificationStatus = VerificationStatus.NOT_APPLICABLE
    message: str = ""
    error_code: str | None = None
    timestamp: float = Field(default_factory=time.time)
    parameters: dict[str, Any] = Field(default_factory=dict)


class ApprovalRequest(BaseModel):
    approval_id: str
    action_name: str
    risk_level: int
    parameters: dict[str, Any] = Field(default_factory=dict)
    description: str
    created_at: float = Field(default_factory=time.time)
    expires_at: float
    status: Literal["pending", "approved", "rejected", "expired"] = "pending"


class ApprovalDecisionRequest(BaseModel):
    decision: Literal["approve", "reject"]
    reason: str | None = None


class ExecuteActionRequest(BaseModel):
    action_name: str
    parameters: dict[str, Any] = Field(default_factory=dict)
    approval_id: str | None = None
