import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
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
    livekit: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHealth()
      .then((h) =>
        setHealth({ status: h.status, livekit: h.livekit })
      )
      .catch(() => setHealth({ status: "degraded", livekit: false }))
      .finally(() => setLoading(false));
  }, []);

  const STATUS_COLOR = {
    ok: "var(--accent-lime)",
    degraded: "var(--accent-coral)",
    unknown: "#64748b",
  };

  const cards = [
    {
      id: "dash-voice-card",
      title: "Voice Assistant",
      desc: "Real-time voice via LiveKit Agents",
      icon: <Mic size={22} />,
      color: "var(--accent-lime)",
      view: "voice" as AppView,
      available: health.livekit,
    },
  ];

  return (
    <div className="dashboard-page" style={{ padding: "clamp(1.25rem, 4vw, 3rem)", maxWidth: 1080, margin: "0 auto", width: "100%" }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="dashboard-hero"
        style={{ marginBottom: "2rem" }}
      >
        <div className="eyebrow"><span className="eyebrow-dot" /> COMMAND CENTER</div>
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
        <p style={{ color: "#64748b", marginTop: "0.25rem" }}>
          Your intelligent workspace is online and ready for your next command.
        </p>
      </motion.div>

      {/* Status card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass status-card"
        style={{ padding: "1.25rem", marginBottom: "1.5rem" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
          <Activity size={18} color="var(--accent-lime)" />
          <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>System Status</span>
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
            { label: "LiveKit Voice", ok: health.livekit },
          ].map(({ label, ok }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              {loading ? (
                <Clock size={16} color="#64748b" />
              ) : ok ? (
                <CheckCircle size={16} color="var(--accent-lime)" />
              ) : (
                <XCircle size={16} color="var(--accent-coral)" />
              )}
              <span style={{ color: loading ? "var(--text-secondary)" : ok ? "var(--accent-lime)" : "var(--accent-coral)", fontSize: "0.875rem" }}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Quick action cards */}
      <div className="dashboard-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px,1fr))", gap: "1rem" }}>
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
            <h3 style={{ fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.25rem" }}>{card.title}</h3>
            <p style={{ color: "#64748b", fontSize: "0.8rem" }}>{card.desc}</p>
            {!card.available && !loading && (
              <p style={{ color: "#f59e0b", fontSize: "0.75rem", marginTop: "0.5rem" }}>
                ⚠ Voice service unavailable
              </p>
            )}
          </motion.button>
        ))}
      </div>

    </div>
  );
}
