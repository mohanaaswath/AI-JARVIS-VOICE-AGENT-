// Message types shared across the app
export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

export type AppView = "chat" | "voice" | "dashboard" | "settings";

export interface HealthStatus {
  status: "ok" | "degraded" | "unknown";
  google_ai: boolean;
  livekit: boolean;
}
