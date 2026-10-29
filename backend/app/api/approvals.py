"""
api/approvals.py — FastAPI endpoints for managing pending user approval workflows.
"""
from fastapi import APIRouter, HTTPException
from app.schemas.actions import ApprovalRequest, ApprovalDecisionRequest
from app.services import get_permission_service

router = APIRouter()


@router.get("/approvals/pending", response_model=list[ApprovalRequest], tags=["Approvals"])
async def list_pending_approvals() -> list[ApprovalRequest]:
    """Retrieves all currently pending approval requests requiring operator confirmation."""
    perm_svc = get_permission_service()
    return perm_svc.get_pending_approvals()


@router.post("/approvals/{approval_id}/approve", tags=["Approvals"])
async def approve_action(approval_id: str) -> dict:
    """Grants explicit operator authorization for a pending action."""
    perm_svc = get_permission_service()
    success = perm_svc.approve(approval_id)
    if not success:
        raise HTTPException(
            status_code=404,
            detail=f"Approval request '{approval_id}' not found or already expired.",
        )
    return {"status": "approved", "approval_id": approval_id}


@router.post("/approvals/{approval_id}/reject", tags=["Approvals"])
async def reject_action(approval_id: str, body: ApprovalDecisionRequest | None = None) -> dict:
    """Rejects a pending action request."""
    perm_svc = get_permission_service()
    reason = body.reason if body else "Rejected by operator"
    success = perm_svc.reject(approval_id, reason=reason)
    if not success:
        raise HTTPException(
            status_code=404,
            detail=f"Approval request '{approval_id}' not found.",
        )
    return {"status": "rejected", "approval_id": approval_id, "reason": reason}
