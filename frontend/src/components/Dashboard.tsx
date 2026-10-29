import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  Cpu,
  HardDrive,
  BatteryCharging,
  Battery,
  Volume2,
  VolumeX,
  Wifi,
  Moon,
  Sun,
  ShieldAlert,
  Check,
  X,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import {
  fetchHealth,
  fetchSystemStatus,
  fetchActivity,
  fetchPendingApprovals,
  approveAction,
  rejectAction,
  executeAction,
} from "../lib/api";
import type {
  AppView,
  HealthStatus,
  SystemStatus,
  ActionResult,
  ApprovalRequest,
} from "../types";

interface DashboardProps {
  onNavigate: (v: AppView) => void;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const [health, setHealth] = useState<HealthStatus>({
    status: "unknown",
    livekit: false,
  });
  const [system, setSystem] = useState<SystemStatus | null>(null);
  const [activities, setActivities] = useState<ActionResult[]>([]);
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [h, s, act, appr] = await Promise.allSettled([
        fetchHealth(),
        fetchSystemStatus(),
        fetchActivity(10),
        fetchPendingApprovals(),
      ]);

      if (h.status === "fulfilled") {
        setHealth({ status: h.value.status, livekit: h.value.livekit });
      } else {
        setHealth({ status: "degraded", livekit: false });
      }

      if (s.status === "fulfilled") {
        setSystem(s.value);
      }

      if (act.status === "fulfilled") {
        setActivities(act.value);
      }

      if (appr.status === "fulfilled") {
        setApprovals(appr.value);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleApprove = async (id: string) => {
    try {
      await approveAction(id);
      await loadData();
    } catch (err) {
      console.error("Failed to approve action:", err);
    }
  };

  const handleReject = async (id: string) => {
    try {
      await rejectAction(id, "Rejected by operator from dashboard");
      await loadData();
    } catch (err) {
      console.error("Failed to reject action:", err);
    }
  };

  const handleQuickAction = async (actionName: string, params: Record<string, any>) => {
    setActionInProgress(actionName);
    try {
      await executeAction(actionName, params);
      await loadData();
    } catch (err) {
      console.error(`Quick action ${actionName} failed:`, err);
    } finally {
      setActionInProgress(null);
    }
  };

  const VERIFICATION_BADGE = {
    verified: { text: "VERIFIED", color: "var(--accent-lime)", bg: "rgba(163,230,53,0.15)" },
    failed: { text: "FAILED", color: "var(--accent-coral)", bg: "rgba(239,68,68,0.15)" },
    unverified: { text: "UNVERIFIED", color: "#f59e0b", bg: "rgba(245,158,11,0.15)" },
    not_applicable: { text: "INFO", color: "#94a3b8", bg: "rgba(148,163,184,0.15)" },
  };

  return (
    <div
      className="dashboard-page"
      style={{
        padding: "clamp(1.25rem, 4vw, 3rem)",
        maxWidth: 1180,
        margin: "0 auto",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: "1.5rem",
      }}
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="dashboard-hero"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <div className="eyebrow">
            <span className="eyebrow-dot" /> COMMAND CENTER // WINDOWS ASSISTANT
          </div>
          <h1
            style={{
              fontSize: "1.75rem",
              fontWeight: 800,
              background: "linear-gradient(120deg,var(--accent-lime),var(--accent-purple))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Good to see you, <span className="gradient-text">Operator.</span>
          </h1>
          <p style={{ color: "#64748b", marginTop: "0.25rem", fontSize: "0.9rem" }}>
            Real-time Windows automation engine online. Microphone, audio, and settings ready.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="glass"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.6rem 1rem",
            borderRadius: "0.5rem",
            color: "var(--text-primary)",
            cursor: "pointer",
            border: "1px solid var(--border)",
            fontSize: "0.85rem",
            fontWeight: 500,
          }}
        >
          <RefreshCw size={14} className={refreshing ? "spin" : ""} />
          {refreshing ? "Refreshing..." : "Refresh Status"}
        </button>
      </motion.div>

      {/* Pending Approvals Banner */}
      <AnimatePresence>
        {approvals.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="glass"
            style={{
              padding: "1.25rem",
              borderRadius: "0.75rem",
              border: "1px solid rgba(245, 158, 11, 0.4)",
              background: "rgba(245, 158, 11, 0.08)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
              <ShieldAlert size={20} color="#f59e0b" />
              <span style={{ fontWeight: 700, color: "#f59e0b", fontSize: "0.95rem" }}>
                Operator Approvals Required ({approvals.length})
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {approvals.map((appr) => (
                <div
                  key={appr.approval_id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "1rem",
                    padding: "0.75rem 1rem",
                    background: "var(--bg-surface)",
                    borderRadius: "0.5rem",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "0.9rem" }}>
                        {appr.action_name}
                      </span>
                      <span
                        style={{
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          padding: "0.15rem 0.5rem",
                          borderRadius: "1rem",
                          background: "rgba(245, 158, 11, 0.2)",
                          color: "#f59e0b",
                        }}
                      >
                        LEVEL {appr.risk_level}
                      </span>
                    </div>
                    <p style={{ color: "#64748b", fontSize: "0.8rem", marginTop: "0.2rem" }}>
                      {appr.description}
                    </p>
                    <code style={{ fontSize: "0.75rem", color: "var(--accent-cyan)" }}>
                      {JSON.stringify(appr.parameters)}
                    </code>
                  </div>

                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      onClick={() => handleApprove(appr.approval_id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.3rem",
                        padding: "0.4rem 0.8rem",
                        background: "rgba(163, 230, 53, 0.2)",
                        border: "1px solid var(--accent-lime)",
                        color: "var(--accent-lime)",
                        borderRadius: "0.375rem",
                        fontWeight: 600,
                        fontSize: "0.8rem",
                        cursor: "pointer",
                      }}
                    >
                      <Check size={14} /> Approve
                    </button>
                    <button
                      onClick={() => handleReject(appr.approval_id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.3rem",
                        padding: "0.4rem 0.8rem",
                        background: "rgba(239, 68, 68, 0.2)",
                        border: "1px solid var(--accent-coral)",
                        color: "var(--accent-coral)",
                        borderRadius: "0.375rem",
                        fontWeight: 600,
                        fontSize: "0.8rem",
                        cursor: "pointer",
                      }}
                    >
                      <X size={14} /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Live System Telemetry Cards Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1rem",
        }}
      >
        {/* LiveKit Voice Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass"
          style={{ padding: "1.25rem", borderRadius: "0.75rem" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <Mic size={18} color="var(--accent-lime)" />
            <span style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 500 }}>LiveKit Voice</span>
          </div>
          <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--text-primary)" }}>
            {loading ? "Checking..." : health.livekit ? "Connected" : "Standby"}
          </div>
          <p style={{ fontSize: "0.75rem", color: health.livekit ? "var(--accent-lime)" : "var(--accent-coral)", marginTop: "0.25rem" }}>
            {health.livekit ? "Ready for voice commands" : "Voice worker offline"}
          </p>
        </motion.div>

        {/* CPU Load Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="glass"
          style={{ padding: "1.25rem", borderRadius: "0.75rem" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <Cpu size={18} color="var(--accent-cyan)" />
            <span style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 500 }}>CPU Usage</span>
          </div>
          <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--text-primary)" }}>
            {system ? `${system.cpu.percent.toFixed(1)}%` : "--"}
          </div>
          <p style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.25rem" }}>
            {system ? `${system.cpu.logical_cores} Logical Cores` : "Reading CPU..."}
          </p>
        </motion.div>

        {/* RAM Usage Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass"
          style={{ padding: "1.25rem", borderRadius: "0.75rem" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <HardDrive size={18} color="var(--accent-purple)" />
            <span style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 500 }}>Memory (RAM)</span>
          </div>
          <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--text-primary)" }}>
            {system ? `${system.memory.percent.toFixed(1)}%` : "--"}
          </div>
          <p style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.25rem" }}>
            {system ? `${(system.memory.used_mb / 1024).toFixed(1)} GB / ${(system.memory.total_mb / 1024).toFixed(1)} GB` : "Reading RAM..."}
          </p>
        </motion.div>

        {/* Master Volume Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass"
          style={{ padding: "1.25rem", borderRadius: "0.75rem" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
            {system?.audio.is_muted ? (
              <VolumeX size={18} color="var(--accent-coral)" />
            ) : (
              <Volume2 size={18} color="var(--accent-lime)" />
            )}
            <span style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 500 }}>Master Volume</span>
          </div>
          <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--text-primary)" }}>
            {system?.audio.master_volume !== undefined && system?.audio.master_volume !== null
              ? `${system.audio.master_volume}%`
              : "100%"}
          </div>
          <p style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.25rem" }}>
            {system?.audio.is_muted ? "Muted" : "Active output"}
          </p>
        </motion.div>

        {/* Battery Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass"
          style={{ padding: "1.25rem", borderRadius: "0.75rem" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
            {system?.battery.power_plugged ? (
              <BatteryCharging size={18} color="var(--accent-lime)" />
            ) : (
              <Battery size={18} color="#64748b" />
            )}
            <span style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 500 }}>Battery</span>
          </div>
          <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--text-primary)" }}>
            {system?.battery.available && system.battery.percent !== null && system.battery.percent !== undefined
              ? `${Math.round(system.battery.percent)}%`
              : "AC Powered"}
          </div>
          <p style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.25rem" }}>
            {system?.battery.available
              ? system.battery.power_plugged
                ? "Charging"
                : "On battery"
              : "Desktop / Fixed power"}
          </p>
        </motion.div>

        {/* Network & Theme Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="glass"
          style={{ padding: "1.25rem", borderRadius: "0.75rem" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <Wifi size={18} color="var(--accent-cyan)" />
            <span style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 500 }}>Network & Theme</span>
          </div>
          <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)" }}>
            {system?.active_interfaces.length
              ? system.active_interfaces[0]
              : "Connected"}
          </div>
          <p style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.25rem" }}>
            {system?.display.dark_mode_enabled ? "Windows Dark Mode" : "Windows Light Mode"}
          </p>
        </motion.div>
      </div>

      {/* Fast Action Shortcuts */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass"
        style={{ padding: "1.25rem", borderRadius: "0.75rem" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
          <Activity size={18} color="var(--accent-lime)" />
          <span style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "0.95rem" }}>
            Instant Windows Control Actions
          </span>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
          <button
            onClick={() => onNavigate("voice")}
            className="btn-glow"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.6rem 1.25rem",
              borderRadius: "0.5rem",
              fontSize: "0.85rem",
              cursor: "pointer",
            }}
          >
            <Mic size={16} /> Open Voice Assistant
          </button>

          <button
            onClick={() => handleQuickAction("set_master_volume", { level: 30 })}
            disabled={actionInProgress !== null}
            className="glass"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.6rem 1rem",
              borderRadius: "0.5rem",
              color: "var(--text-primary)",
              border: "1px solid var(--border)",
              fontSize: "0.85rem",
              cursor: "pointer",
            }}
          >
            <Volume2 size={16} color="var(--accent-lime)" />
            Set Volume 30%
          </button>

          <button
            onClick={() => handleQuickAction("set_master_volume", { level: 80 })}
            disabled={actionInProgress !== null}
            className="glass"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.6rem 1rem",
              borderRadius: "0.5rem",
              color: "var(--text-primary)",
              border: "1px solid var(--border)",
              fontSize: "0.85rem",
              cursor: "pointer",
            }}
          >
            <Volume2 size={16} color="var(--accent-lime)" />
            Set Volume 80%
          </button>

          <button
            onClick={() =>
              handleQuickAction("set_dark_mode", {
                enabled: !(system?.display.dark_mode_enabled ?? true),
              })
            }
            disabled={actionInProgress !== null}
            className="glass"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.6rem 1rem",
              borderRadius: "0.5rem",
              color: "var(--text-primary)",
              border: "1px solid var(--border)",
              fontSize: "0.85rem",
              cursor: "pointer",
            }}
          >
            {system?.display.dark_mode_enabled ? (
              <>
                <Sun size={16} color="#f59e0b" /> Switch to Light Mode
              </>
            ) : (
              <>
                <Moon size={16} color="var(--accent-purple)" /> Switch to Dark Mode
              </>
            )}
          </button>

          <button
            onClick={() => handleQuickAction("open_settings_page", { page: "sound" })}
            disabled={actionInProgress !== null}
            className="glass"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.6rem 1rem",
              borderRadius: "0.5rem",
              color: "var(--text-primary)",
              border: "1px solid var(--border)",
              fontSize: "0.85rem",
              cursor: "pointer",
            }}
          >
            <ExternalLink size={16} color="var(--accent-cyan)" />
            Sound Settings
          </button>

          <button
            onClick={() => handleQuickAction("open_settings_page", { page: "bluetooth" })}
            disabled={actionInProgress !== null}
            className="glass"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.6rem 1rem",
              borderRadius: "0.5rem",
              color: "var(--text-primary)",
              border: "1px solid var(--border)",
              fontSize: "0.85rem",
              cursor: "pointer",
            }}
          >
            <ExternalLink size={16} color="var(--accent-cyan)" />
            Bluetooth Settings
          </button>

          <button
            onClick={() => handleQuickAction("open_application", { application_name: "notepad" })}
            disabled={actionInProgress !== null}
            className="glass"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.6rem 1rem",
              borderRadius: "0.5rem",
              color: "var(--text-primary)",
              border: "1px solid var(--border)",
              fontSize: "0.85rem",
              cursor: "pointer",
            }}
          >
            <ExternalLink size={16} color="var(--accent-lime)" />
            Launch Notepad
          </button>

          <button
            onClick={() => handleQuickAction("open_application", { application_name: "calculator" })}
            disabled={actionInProgress !== null}
            className="glass"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.6rem 1rem",
              borderRadius: "0.5rem",
              color: "var(--text-primary)",
              border: "1px solid var(--border)",
              fontSize: "0.85rem",
              cursor: "pointer",
            }}
          >
            <ExternalLink size={16} color="var(--accent-lime)" />
            Launch Calculator
          </button>
        </div>
      </motion.div>

      {/* Live Action Activity & Verification Feed */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="glass"
        style={{ padding: "1.25rem", borderRadius: "0.75rem" }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Clock size={18} color="var(--accent-cyan)" />
            <span style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "0.95rem" }}>
              Live Action Audit & Verification Log
            </span>
          </div>
          <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
            Showing recent operations
          </span>
        </div>

        {activities.length === 0 ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "#64748b", fontSize: "0.875rem" }}>
            No actions recorded yet. Speak a voice command or click an action above to start.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {activities.map((act) => {
              const badge = VERIFICATION_BADGE[act.verification_status] || VERIFICATION_BADGE.not_applicable;
              const dateStr = new Date(act.timestamp * 1000).toLocaleTimeString();
              const isSuccess = act.status === "success";

              return (
                <div
                  key={act.action_id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0.75rem 1rem",
                    background: "var(--bg-surface)",
                    borderRadius: "0.5rem",
                    border: "1px solid var(--border)",
                    flexWrap: "wrap",
                    gap: "0.75rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", minWidth: 200 }}>
                    {isSuccess ? (
                      <CheckCircle size={16} color="var(--accent-lime)" />
                    ) : (
                      <XCircle size={16} color="var(--accent-coral)" />
                    )}
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--text-primary)" }}>
                        {act.action_name}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                        {dateStr} // ID: {act.action_id}
                      </div>
                    </div>
                  </div>

                  <div style={{ flex: 1, minWidth: 240, fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                    {act.message}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span
                      style={{
                        padding: "0.2rem 0.6rem",
                        borderRadius: "1rem",
                        fontSize: "0.7rem",
                        fontWeight: 700,
                        background: badge.bg,
                        color: badge.color,
                        border: `1px solid ${badge.color}44`,
                      }}
                    >
                      {badge.text}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}
