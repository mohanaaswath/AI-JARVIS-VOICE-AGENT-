export type AppView = "dashboard" | "voice" | "notes" | "tasks" | "settings";

export type OperatingMode = "online" | "offline";

export type AIModelStatus =
  | "online"
  | "offline"
  | "connecting"
  | "loading"
  | "local_ready"
  | "cloud_ready"
  | "unconfigured"
  | "error";

export type AIProvider = "gemini" | "openai" | "claude" | "local";

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  model?: string;
  provider?: AIProvider;
  isOffline?: boolean;
  toolCalls?: {
    name: string;
    args: Record<string, any>;
    result?: any;
  }[];
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messageCount?: number;
}

export interface NoteItem {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export interface TaskItem {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: "low" | "medium" | "high";
  dueDate?: string;
  createdAt: number;
  completedAt?: number;
}

export interface VoiceSettings {
  voiceURI: string;
  lang: string;
  rate: number;
  pitch: number;
  volume: number;
  autoSpeak: boolean;
  continuousListening: boolean;
}

export interface UserPreferences {
  theme: "dark" | "light";
  activeProvider: AIProvider;
  geminiApiKey?: string;
  openaiApiKey?: string;
  claudeApiKey?: string;
  customEndpoint?: string;
  geminiModel: string;
  openaiModel: string;
  claudeModel: string;
  localModelEnabled: boolean;
  voice: VoiceSettings;
  webSearchEnabled: boolean;
}

export interface HealthStatus {
  status: "ok" | "degraded" | "unknown";
  livekit: boolean;
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
