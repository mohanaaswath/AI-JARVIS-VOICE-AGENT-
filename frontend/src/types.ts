export type AppView = "voice" | "dashboard" | "settings";

export interface HealthStatus {
  status: "ok" | "degraded" | "unknown";
  livekit: boolean;
}

export interface AgentStatus {
  available: boolean;
  state: "running" | "offline" | "unknown";
  reason?: string;
  age_seconds?: number;
  agent_name?: string;
  pid?: number;
  settings?: AgentSettings;
  wake_word?: {
    available: boolean;
    reason: string;
    wake_word: string;
  };
}

export interface AgentSettings {
  wake_word_enabled: boolean;
  microphone_muted: boolean;
  wake_word_sensitivity: number;
  conversation_mode: "single" | "continuous";
  inactivity_timeout_seconds: number;
}

export type ActionStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "executing"
  | "success"
  | "failed"
  | "timeout"
  | "cancelled";

export type VerificationStatus =
  | "verified"
  | "unverified"
  | "failed"
  | "not_applicable";

export interface ActionResult {
  action_id: string;
  action_name: string;
  risk_level: number;
  status: ActionStatus;
  requested_value?: any;
  observed_value?: any;
  verification_status: VerificationStatus;
  message: string;
  error_code?: string | null;
  timestamp: number;
  parameters?: Record<string, any>;
}

export interface ApprovalRequest {
  approval_id: string;
  action_name: string;
  risk_level: number;
  parameters: Record<string, any>;
  description: string;
  created_at: number;
  expires_at: number;
  status: "pending" | "approved" | "rejected" | "expired";
}

export interface CpuInfo {
  percent: number;
  logical_cores: number;
  physical_cores?: number | null;
}

export interface MemoryInfo {
  total_mb: number;
  used_mb: number;
  available_mb: number;
  percent: number;
}

export interface BatteryInfo {
  available: boolean;
  percent?: number | null;
  power_plugged?: boolean | null;
  secs_left?: number | null;
}

export interface AudioInfo {
  master_volume?: number | null;
  is_muted?: boolean | null;
  device_name?: string | null;
}

export interface DisplayInfo {
  dark_mode_enabled?: boolean | null;
  apps_use_light?: number | null;
  system_uses_light?: number | null;
}

export interface NetworkInterfaceInfo {
  name: string;
  is_up: boolean;
  speed_mbps?: number | null;
}

export interface SystemStatus {
  timestamp: number;
  os_name: string;
  os_version: string;
  hostname: string;
  cpu: CpuInfo;
  memory: MemoryInfo;
  battery: BatteryInfo;
  audio: AudioInfo;
  display: DisplayInfo;
  network_interfaces: NetworkInterfaceInfo[];
  active_interfaces: string[];
  agent_ready: boolean;
}
