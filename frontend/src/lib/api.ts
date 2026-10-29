// API client — all calls go through the Vite proxy (/api → localhost:8000)
import axios from "axios";
import type {
  ActionResult,
  ApprovalRequest,
  SystemStatus,
} from "../types";

const api = axios.create({
  baseURL: "/api",
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

// ── Types ─────────────────────────────────────────────────────────────────────
export interface HealthResponse {
  status: "ok" | "degraded";
  livekit: boolean;
  version: string;
}

export interface TokenResponse {
  token: string;
  url: string;
  room_name: string;
  participant_identity: string;
}

// ── API functions ─────────────────────────────────────────────────────────────
export async function fetchHealth(): Promise<HealthResponse> {
  const { data } = await api.get<HealthResponse>("/health");
  return data;
}

export async function fetchLiveKitToken(
  roomName: string,
  participantIdentity: string
): Promise<TokenResponse> {
  const { data } = await api.post<TokenResponse>("/livekit/token", {
    room_name: roomName,
    participant_identity: participantIdentity,
  });
  return data;
}

export async function fetchLiveKitStatus(): Promise<{
  configured: boolean;
  url: string | null;
}> {
  const { data } = await api.get("/livekit/status");
  return data;
}

// ── System & Diagnostics API ──────────────────────────────────────────────────
export async function fetchSystemStatus(): Promise<SystemStatus> {
  const { data } = await api.get<SystemStatus>("/system/status");
  return data;
}

export async function executeAction(
  actionName: string,
  parameters: Record<string, any> = {},
  approvalId?: string
): Promise<ActionResult> {
  const { data } = await api.post<ActionResult>("/system/actions", {
    action_name: actionName,
    parameters,
    approval_id: approvalId,
  });
  return data;
}

// ── Activity History API ──────────────────────────────────────────────────────
export async function fetchActivity(limit = 50): Promise<ActionResult[]> {
  const { data } = await api.get<ActionResult[]>("/activity", {
    params: { limit },
  });
  return data;
}

export async function fetchActivityDetail(actionId: string): Promise<ActionResult> {
  const { data } = await api.get<ActionResult>(`/activity/${actionId}`);
  return data;
}

// ── Approvals API ─────────────────────────────────────────────────────────────
export async function fetchPendingApprovals(): Promise<ApprovalRequest[]> {
  const { data } = await api.get<ApprovalRequest[]>("/approvals/pending");
  return data;
}

export async function approveAction(approvalId: string): Promise<{ status: string }> {
  const { data } = await api.post<{ status: string }>(`/approvals/${approvalId}/approve`);
  return data;
}

export async function rejectAction(
  approvalId: string,
  reason?: string
): Promise<{ status: string }> {
  const { data } = await api.post<{ status: string }>(`/approvals/${approvalId}/reject`, {
    reason,
  });
  return data;
}

export default api;
