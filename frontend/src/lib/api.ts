// API client — all calls go through the Vite proxy (/api → localhost:8000)
import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

// ── Types ─────────────────────────────────────────────────────────────────────
export interface ChatResponse {
  reply: string;
  session_id?: string;
}

export interface HealthResponse {
  status: "ok" | "degraded";
  google_ai: boolean;
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

export async function sendMessage(message: string): Promise<ChatResponse> {
  const { data } = await api.post<ChatResponse>("/chat", { message });
  return data;
}

export async function resetChat(): Promise<void> {
  await api.post("/chat/reset");
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

// Stream chat — returns an EventSource-like async generator
export async function* streamChat(message: string): AsyncGenerator<string> {
  const response = await fetch("/api/chat/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });

  if (!response.ok || !response.body) {
    throw new Error(`Stream failed: ${response.statusText}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const chunk = line.slice(6);
        if (chunk === "[DONE]") return;
        if (chunk.startsWith("[ERROR]")) throw new Error(chunk);
        yield chunk;
      }
    }
  }
}

export default api;
