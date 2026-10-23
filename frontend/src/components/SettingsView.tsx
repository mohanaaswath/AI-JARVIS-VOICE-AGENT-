import { useState } from "react";
import { motion } from "framer-motion";
import { Moon, Trash2, Info, Volume2 } from "lucide-react";
import { resetChat } from "../lib/api";

export default function SettingsView() {
  const [cleared, setCleared] = useState(false);

  const handleClearHistory = async () => {
    await resetChat();
    setCleared(true);
    setTimeout(() => setCleared(false), 3000);
  };

  return (
    <div style={{ padding: "2rem", maxWidth: 640, margin: "0 auto" }}>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#f1f5f9", marginBottom: "0.25rem" }}>
          Settings
        </h1>
        <p style={{ color: "#64748b", marginBottom: "2rem", fontSize: "0.875rem" }}>
          Configure your JARVIS experience
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Appearance */}
          <Section icon={<Moon size={18} color="#8b5cf6" />} title="Appearance">
            <Row label="Theme" desc="Dark mode only (default)" />
          </Section>

          {/* Voice */}
          <Section icon={<Volume2 size={18} color="#06b6d4" />} title="Voice Preferences">
            <Row
              label="Voice Model"
              desc='Google Realtime "Puck" (configured in agent.py)'
            />
            <Row
              label="Noise Cancellation"
              desc="Enabled via livekit-plugins-noise-cancellation"
            />
          </Section>

          {/* Conversation */}
          <Section icon={<Trash2 size={18} color="#ef4444" />} title="Conversation">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <p style={{ color: "#e2e8f0", fontSize: "0.875rem", fontWeight: 500 }}>
                  Clear Chat History
                </p>
                <p style={{ color: "#64748b", fontSize: "0.78rem", marginTop: 2 }}>
                  Resets the current conversation session in memory
                </p>
              </div>
              <button
                id="clear-history-btn"
                onClick={handleClearHistory}
                style={{
                  padding: "0.5rem 1rem",
                  background: cleared ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.1)",
                  border: `1px solid ${cleared ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
                  borderRadius: "0.625rem",
                  color: cleared ? "#6ee7b7" : "#fca5a5",
                  cursor: "pointer",
                  fontSize: "0.8rem",
                  fontWeight: 500,
                  transition: "all 0.2s",
                }}
              >
                {cleared ? "✓ Cleared" : "Clear"}
              </button>
            </div>
          </Section>

          {/* Connection info */}
          <Section icon={<Info size={18} color="#f59e0b" />} title="Connection Information">
            <Row label="Backend" desc="http://localhost:8000 (FastAPI)" />
            <Row label="Text Chat" desc="Google Gemini 1.5 Flash" />
            <Row label="Voice" desc="LiveKit Cloud + Google Realtime Voice" />
            <Row label="Agent Instruction" desc="Loaded from prompt.py (single source of truth)" />
          </Section>
        </div>
      </motion.div>
    </div>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="glass"
      style={{ padding: "1.25rem" }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
        {icon}
        <span style={{ fontWeight: 600, color: "#f1f5f9", fontSize: "0.9rem" }}>{title}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {children}
      </div>
    </div>
  );
}

function Row({ label, desc }: { label: string; desc: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
      <span style={{ color: "#94a3b8", fontSize: "0.85rem" }}>{label}</span>
      <span style={{ color: "#64748b", fontSize: "0.8rem", textAlign: "right" }}>{desc}</span>
    </div>
  );
}
