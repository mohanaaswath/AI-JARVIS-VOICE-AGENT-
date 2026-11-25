import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Moon,
  Sun,
  Volume2,
  Database,
  Download,
  Upload,
  Trash2,
  Check,
  Bot,
} from "lucide-react";
import type { UserPreferences, AIProvider } from "../types";
import {
  getPreferences,
  savePreferences,
  exportAllData,
  importAllData,
  clearAllData,
} from "../lib/storage";
import { voiceEngine } from "../lib/voice";

interface SettingsViewProps {
  theme: "light" | "dark";
  onThemeChange: (theme: "light" | "dark") => void;
}

export default function SettingsView({ theme, onThemeChange }: SettingsViewProps) {
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    loadSettings();
    const voices = voiceEngine.getAvailableVoices();
    setAvailableVoices(voices);

    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = () => {
        setAvailableVoices(voiceEngine.getAvailableVoices());
      };
    }
  }, []);

  const loadSettings = async () => {
    const p = await getPreferences();
    setPrefs(p);
  };

  const handleUpdate = async (updated: Partial<UserPreferences>) => {
    if (!prefs) return;
    const newPrefs = { ...prefs, ...updated };
    setPrefs(newPrefs);
    await savePreferences(newPrefs);
    if (updated.voice) {
      voiceEngine.updateSettings(updated.voice);
    }
    setSaveStatus("Settings saved successfully.");
    setTimeout(() => setSaveStatus(null), 2500);
  };

  const handleExport = async () => {
    const jsonStr = await exportAllData();
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `jarvis_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      await importAllData(text);
      alert("Local data imported successfully! Conversations, notes, and tasks restored.");
      loadSettings();
    } catch {
      alert("Invalid backup file format.");
    }
  };

  const handleClear = async () => {
    await clearAllData();
    setConfirmClear(false);
    alert("All local conversation history, notes, and tasks have been cleared.");
  };

  if (!prefs) return null;

  return (
    <div style={{ padding: "2rem", maxWidth: 760, margin: "0 auto", width: "100%" }}>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 style={{ fontSize: "2rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "0.25rem" }}>
          JARVIS Settings & AI Providers
        </h1>
        <p style={{ color: "var(--text-secondary)", marginBottom: "1.75rem", fontSize: "0.9rem" }}>
          Configure cloud AI intelligence, browser speech synthesis, and offline IndexedDB data.
        </p>

        {saveStatus && (
          <div
            className="glass"
            style={{
              padding: "0.75rem 1rem",
              marginBottom: "1.25rem",
              borderColor: "var(--accent-cyan)",
              color: "var(--accent-cyan)",
              fontSize: "0.85rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <Check size={16} /> {saveStatus}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* AI Provider Section */}
          <Section icon={<Bot size={18} color="var(--accent-cyan)" />} title="AI Provider & Cloud Models">
            <div>
              <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "block", marginBottom: "0.4rem" }}>
                Active AI Engine
              </label>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                {(["gemini", "openai", "claude"] as AIProvider[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => handleUpdate({ activeProvider: p })}
                    style={{
                      padding: "0.5rem 1rem",
                      borderRadius: "0.5rem",
                      background: prefs.activeProvider === p ? "var(--nav-active)" : "var(--bg-secondary)",
                      border: `1px solid ${prefs.activeProvider === p ? "var(--accent-cyan)" : "var(--border)"}`,
                      color: prefs.activeProvider === p ? "var(--accent-cyan)" : "var(--text-secondary)",
                      fontWeight: 600,
                      cursor: "pointer",
                      textTransform: "capitalize",
                      fontSize: "0.85rem",
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {prefs.activeProvider === "gemini" && (
              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "block", marginBottom: "0.4rem" }}>
                  Google Gemini API Key (Optional client key or configured on backend)
                </label>
                <input
                  type="password"
                  placeholder="AIzaSy..."
                  value={prefs.geminiApiKey || ""}
                  onChange={(e) => handleUpdate({ geminiApiKey: e.target.value })}
                  style={inputStyle}
                />
              </div>
            )}

            {prefs.activeProvider === "openai" && (
              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "block", marginBottom: "0.4rem" }}>
                  OpenAI API Key
                </label>
                <input
                  type="password"
                  placeholder="sk-..."
                  value={prefs.openaiApiKey || ""}
                  onChange={(e) => handleUpdate({ openaiApiKey: e.target.value })}
                  style={inputStyle}
                />
              </div>
            )}

            {prefs.activeProvider === "claude" && (
              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "block", marginBottom: "0.4rem" }}>
                  Anthropic Claude API Key
                </label>
                <input
                  type="password"
                  placeholder="sk-ant-..."
                  value={prefs.claudeApiKey || ""}
                  onChange={(e) => handleUpdate({ claudeApiKey: e.target.value })}
                  style={inputStyle}
                />
              </div>
            )}

            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginTop: "0.5rem" }}>
              <input
                type="checkbox"
                id="searchToggle"
                checked={prefs.webSearchEnabled}
                onChange={(e) => handleUpdate({ webSearchEnabled: e.target.checked })}
              />
              <label htmlFor="searchToggle" style={{ fontSize: "0.85rem", color: "var(--text-primary)", cursor: "pointer" }}>
                Enable Real-Time Web Search enhancement
              </label>
            </div>
          </Section>

          {/* Voice & Speech Synthesis Section */}
          <Section icon={<Volume2 size={18} color="var(--accent-purple)" />} title="Voice Interaction & Speech Synthesis">
            <div>
              <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "block", marginBottom: "0.4rem" }}>
                Select Browser Voice
              </label>
              <select
                value={prefs.voice.voiceURI}
                onChange={(e) =>
                  handleUpdate({
                    voice: { ...prefs.voice, voiceURI: e.target.value },
                  })
                }
                style={inputStyle}
              >
                <option value="">Default System Voice</option>
                {availableVoices.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "block", marginBottom: "0.4rem" }}>
                  Speaking Speed (Rate: {prefs.voice.rate}x)
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={prefs.voice.rate}
                  onChange={(e) =>
                    handleUpdate({
                      voice: { ...prefs.voice, rate: parseFloat(e.target.value) },
                    })
                  }
                  style={{ width: "100%" }}
                />
              </div>

              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "block", marginBottom: "0.4rem" }}>
                  Pitch ({prefs.voice.pitch})
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="1.5"
                  step="0.1"
                  value={prefs.voice.pitch}
                  onChange={(e) =>
                    handleUpdate({
                      voice: { ...prefs.voice, pitch: parseFloat(e.target.value) },
                    })
                  }
                  style={{ width: "100%" }}
                />
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginTop: "0.5rem" }}>
              <input
                type="checkbox"
                id="autoSpeakToggle"
                checked={prefs.voice.autoSpeak}
                onChange={(e) =>
                  handleUpdate({
                    voice: { ...prefs.voice, autoSpeak: e.target.checked },
                  })
                }
              />
              <label htmlFor="autoSpeakToggle" style={{ fontSize: "0.85rem", color: "var(--text-primary)", cursor: "pointer" }}>
                Automatically read assistant answers aloud (TTS)
              </label>
            </div>
          </Section>

          {/* Theme Section */}
          <Section icon={theme === "dark" ? <Moon size={18} color="var(--accent-cyan)" /> : <Sun size={18} color="var(--accent-cyan)" />} title="Interface Theme">
            <div style={{ display: "flex", gap: "0.5rem" }}>
              {(["light", "dark"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => onThemeChange(option)}
                  style={{
                    padding: "0.5rem 1.25rem",
                    borderRadius: "0.5rem",
                    background: theme === option ? "var(--nav-active)" : "var(--bg-secondary)",
                    border: `1px solid ${theme === option ? "var(--accent-cyan)" : "var(--border)"}`,
                    color: theme === option ? "var(--accent-cyan)" : "var(--text-secondary)",
                    cursor: "pointer",
                    textTransform: "capitalize",
                    fontWeight: 600,
                  }}
                >
                  {option}
                </button>
              ))}
            </div>
          </Section>

          {/* IndexedDB Data Management Section */}
          <Section icon={<Database size={18} color="var(--accent-cyan)" />} title="Offline Data Storage (IndexedDB)">
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
              All conversations, notes, and tasks are stored locally in your browser. You can export a backup or restore it at any time.
            </p>

            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
              <button
                onClick={handleExport}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.5rem 1rem",
                  borderRadius: "0.5rem",
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                }}
              >
                <Download size={15} /> Export Backup (JSON)
              </button>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.5rem 1rem",
                  borderRadius: "0.5rem",
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                }}
              >
                <Upload size={15} /> Import Backup
                <input type="file" accept=".json" onChange={handleImport} style={{ display: "none" }} />
              </label>

              {!confirmClear ? (
                <button
                  onClick={() => setConfirmClear(true)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.5rem 1rem",
                    borderRadius: "0.5rem",
                    background: "transparent",
                    border: "1px solid rgba(255,128,102,0.4)",
                    color: "var(--accent-coral)",
                    cursor: "pointer",
                    fontSize: "0.85rem",
                  }}
                >
                  <Trash2 size={15} /> Clear All Local Data
                </button>
              ) : (
                <button
                  onClick={handleClear}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.5rem 1rem",
                    borderRadius: "0.5rem",
                    background: "var(--accent-coral)",
                    border: "none",
                    color: "#ffffff",
                    fontWeight: 600,
                    cursor: "pointer",
                    fontSize: "0.85rem",
                  }}
                >
                  Confirm Delete Everything?
                </button>
              )}
            </div>
          </Section>
        </div>
      </motion.div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.75rem",
  borderRadius: "0.5rem",
  background: "var(--bg-secondary)",
  border: "1px solid var(--border)",
  color: "var(--text-primary)",
  outline: "none",
  fontSize: "0.9rem",
};

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
    <div className="glass" style={{ padding: "1.25rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
        {icon}
        <span style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "0.95rem" }}>
          {title}
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>{children}</div>
    </div>
  );
}
