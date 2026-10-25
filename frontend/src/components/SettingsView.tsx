import { motion } from "framer-motion";
import { Moon, Info, Volume2 } from "lucide-react";

export default function SettingsView() {
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

          {/* Connection info */}
          <Section icon={<Info size={18} color="#f59e0b" />} title="Connection Information">
            <Row label="Backend" desc="http://localhost:8000 (FastAPI)" />
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
