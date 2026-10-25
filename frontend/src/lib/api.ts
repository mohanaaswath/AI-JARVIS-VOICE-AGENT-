// API client — all calls go through the Vite proxy (/api → localhost:8000)
import axios from "axios";

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

export default api;
