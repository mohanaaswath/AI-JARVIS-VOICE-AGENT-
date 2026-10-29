import { motion } from "framer-motion";
import { Moon, Sun } from "lucide-react";

interface SettingsViewProps {
  theme: "light" | "dark";
  onThemeChange: (theme: "light" | "dark") => void;
}

export default function SettingsView({ theme, onThemeChange }: SettingsViewProps) {
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
