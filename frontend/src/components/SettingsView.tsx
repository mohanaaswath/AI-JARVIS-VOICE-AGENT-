import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { MicOff, Moon, Radio, Sun } from "lucide-react";
import { fetchAgentStatus, updateAgentSettings } from "../lib/api";
import type { AgentSettings } from "../types";

interface SettingsViewProps {
  theme: "light" | "dark";
  onThemeChange: (theme: "light" | "dark") => void;
}

export default function SettingsView({ theme, onThemeChange }: SettingsViewProps) {
  const [agentSettings, setAgentSettings] = useState<AgentSettings | null>(null);
  const [agentError, setAgentError] = useState<string | null>(null);

  useEffect(() => {
    fetchAgentStatus()
      .then((status) => setAgentSettings(status.settings ?? null))
      .catch(() => setAgentError("Local agent settings are unavailable."));
  }, []);

  const updateSetting = async (change: Partial<AgentSettings>) => {
    try {
      const result = await updateAgentSettings(change);
      setAgentSettings(result.settings);
      setAgentError(null);
    } catch (error) {
      setAgentError(error instanceof Error ? error.message : "Could not update agent settings.");
    }
  };

  return (
    <div style={{ padding: "2rem", maxWidth: 640, margin: "0 auto" }}>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="eyebrow"><span className="eyebrow-dot" /> CONTROL DECK</div>
        <h1 style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", fontWeight: 800, letterSpacing: "-.06em", color: "var(--text-primary)", marginTop: ".8rem", marginBottom: "0.5rem" }}>
          Settings
        </h1>
        <p style={{ color: "var(--text-secondary)", marginBottom: "2rem", fontSize: "0.875rem" }}>
          Configure your JARVIS experience
        </p>

        <Section icon={theme === "dark" ? <Moon size={18} color="var(--accent-lime)" /> : <Sun size={18} color="var(--accent-lime)" />} title="Interface theme">
          <div className="theme-options" role="group" aria-label="Theme">
            {(["light", "dark"] as const).map((option) => (
              <button
                key={option}
                type="button"
                className={`theme-option${theme === option ? " active" : ""}`}
                onClick={() => onThemeChange(option)}
                aria-pressed={theme === option}
              >
                {option === "light" ? <Sun size={16} /> : <Moon size={16} />}
                {option[0].toUpperCase() + option.slice(1)}
              </button>
            ))}
          </div>
        </Section>

        <div style={{ height: "1rem" }} />
        <Section icon={<Radio size={18} color="var(--accent-lime)" />} title="Background voice agent">
          <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: "var(--text-primary)", fontSize: "0.9rem" }}>
            Wake word readiness
            <span style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>
              {agentSettings ? "Hey Jarvis settings available" : "Loading"}
            </span>
          </label>
          <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: "var(--text-primary)", fontSize: "0.9rem" }}>
            Mute microphone
            <input
              type="checkbox"
              checked={agentSettings?.microphone_muted ?? false}
              disabled={!agentSettings}
              onChange={(event) => updateSetting({ microphone_muted: event.target.checked })}
            />
          </label>
          <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: "var(--text-primary)", fontSize: "0.9rem" }}>
            Enable wake word
            <input
              type="checkbox"
              checked={agentSettings?.wake_word_enabled ?? false}
              disabled={!agentSettings}
              onChange={(event) => updateSetting({ wake_word_enabled: event.target.checked })}
            />
          </label>
          {agentSettings && (
            <label style={{ color: "var(--text-primary)", fontSize: "0.9rem" }}>
              Sensitivity: {agentSettings.wake_word_sensitivity.toFixed(2)}
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={agentSettings.wake_word_sensitivity}
                onChange={(event) => updateSetting({ wake_word_sensitivity: Number(event.target.value) })}
                style={{ width: "100%" }}
              />
            </label>
          )}
          {agentError && <p style={{ color: "var(--accent-coral)", fontSize: "0.8rem" }}>{agentError}</p>}
          {!agentSettings && !agentError && <p style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}><MicOff size={14} /> Offline wake-word engine is not configured.</p>}
        </Section>
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
        <span style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "0.9rem" }}>{title}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {children}
      </div>
    </div>
  );
}
