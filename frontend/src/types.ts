export type AppView = "voice" | "dashboard" | "settings";

export interface HealthStatus {
  status: "ok" | "degraded" | "unknown";
  livekit: boolean;
}
