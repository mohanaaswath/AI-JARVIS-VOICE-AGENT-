import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  MessageSquare,
  Mic,
  Activity,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import { fetchHealth } from "../lib/api";
import type { AppView, HealthStatus } from "../types";

interface DashboardProps {
  onNavigate: (v: AppView) => void;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const [health, setHealth] = useState<HealthStatus>({
    status: "unknown",
    google_ai: false,
    livekit: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHealth()
      .then((h) =>
        setHealth({ status: h.status, google_ai: h.google_ai, livekit: h.livekit })
      )
      .catch(() => setHealth({ status: "degraded", google_ai: false, livekit: false }))
      .finally(() => setLoading(false));
  }, []);

  const STATUS_COLOR = {
    ok: "#10b981",
    degraded: "#f59e0b",
    unknown: "#64748b",
  };

  const cards = [
    {
      id: "dash-chat-card",
      title: "Text Chat",
      desc: "Chat with JARVIS using Google Gemini",
      icon: <MessageSquare size={22} />,
      color: "#8b5cf6",
      view: "chat" as AppView,
      available: health.google_ai,
    },
    {
      id: "dash-voice-card",
      title: "Voice Assistant",
      desc: "Real-time voice via LiveKit Agents",
      icon: <Mic size={22} />,
      color: "#06b6d4",
      view: "voice" as AppView,
      available: health.livekit,
    },
  ];

  return (
    <div style={{ padding: "2rem", maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: "2rem" }}
      >
        <h1
          style={{
            fontSize: "1.75rem",
            fontWeight: 800,
            background: "linear-gradient(135deg,#8b5cf6,#06b6d4)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Dashboard
        </h1>
        <p style={{ color: "#64748b", marginTop: "0.25rem" }}>
          Welcome back. Here's your JARVIS status overview.
        </p>
      </motion.div>

      {/* Status card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass"
        style={{ padding: "1.25rem", marginBottom: "1.5rem" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
          <Activity size={18} color="#8b5cf6" />
          <span style={{ fontWeight: 600, color: "#f1f5f9" }}>System Status</span>
          {!loading && (
            <span
              style={{
                marginLeft: "auto",
                padding: "0.2rem 0.6rem",
                borderRadius: "2rem",
                background: `${STATUS_COLOR[health.status]}22`,
                color: STATUS_COLOR[health.status],
                fontSize: "0.75rem",
                fontWeight: 600,
              }}
            >
              {health.status.toUpperCase()}
            </span>
          )}
        </div>

        <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
          {[
            { label: "Google AI (Gemini)", ok: health.google_ai },
            { label: "LiveKit Voice", ok: health.livekit },
          ].map(({ label, ok }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              {loading ? (
                <Clock size={16} color="#64748b" />
              ) : ok ? (
                <CheckCircle size={16} color="#10b981" />
              ) : (
                <XCircle size={16} color="#ef4444" />
              )}
              <span style={{ color: loading ? "#64748b" : ok ? "#a7f3d0" : "#fca5a5", fontSize: "0.875rem" }}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Quick action cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px,1fr))", gap: "1rem" }}>
        {cards.map((card, i) => (
          <motion.button
            key={card.id}
            id={card.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.08 }}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigate(card.view)}
            className="glass"
            style={{
              padding: "1.5rem",
              cursor: "pointer",
              textAlign: "left",
              border: `1px solid ${card.color}33`,
              transition: "box-shadow 0.2s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 0 24px ${card.color}22`;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "0.75rem",
                background: `${card.color}22`,
                border: `1px solid ${card.color}44`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: card.color,
                marginBottom: "0.875rem",
              }}
            >
              {card.icon}
            </div>
            <h3 style={{ fontWeight: 700, color: "#f1f5f9", marginBottom: "0.25rem" }}>{card.title}</h3>
            <p style={{ color: "#64748b", fontSize: "0.8rem" }}>{card.desc}</p>
            {!card.available && !loading && (
              <p style={{ color: "#f59e0b", fontSize: "0.75rem", marginTop: "0.5rem" }}>
                ⚠ Requires API key configuration
              </p>
            )}
          </motion.button>
        ))}
      </div>

      {/* Info box */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        style={{
          marginTop: "2rem",
          padding: "1rem",
          background: "rgba(139,92,246,0.06)",
          border: "1px solid rgba(139,92,246,0.15)",
          borderRadius: "0.75rem",
          color: "#64748b",
          fontSize: "0.8rem",
          lineHeight: 1.7,
        }}
      >
        <strong style={{ color: "#a78bfa" }}>💡 Architecture Note:</strong> Text chat uses{" "}
        <code style={{ color: "#06b6d4" }}>Gemini 1.5 Flash</code> with the same{" "}
        <code style={{ color: "#06b6d4" }}>Agent_Instruction</code> from your{" "}
        <code>prompt.py</code>. Voice uses your existing{" "}
        <code>agent.py</code> LiveKit session — run it separately with{" "}
        <code style={{ color: "#8b5cf6" }}>python agent.py start</code>.
      </motion.div>
    </div>
  );
}
