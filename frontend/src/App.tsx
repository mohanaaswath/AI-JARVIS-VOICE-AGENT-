import { useEffect, useState } from "react";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import VoiceView from "./components/VoiceView";
import SettingsView from "./components/SettingsView";
import type { AppView } from "./types";

export default function App() {
  const [view, setView] = useState<AppView>("voice");
  const [theme, setTheme] = useState<"light" | "dark">(
    () => (localStorage.getItem("jarvis-theme") as "light" | "dark") || "dark"
  );
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => window.innerWidth <= 640
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("jarvis-theme", theme);
  }, [theme]);

  const renderView = () => {
    switch (view) {
      case "dashboard":
        return <Dashboard onNavigate={setView} />;
      case "voice":
        return <VoiceView />;
      case "settings":
        return <SettingsView theme={theme} onThemeChange={setTheme} />;
      default:
        return <Dashboard onNavigate={setView} />;
    }
  };

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        overflow: "hidden",
        background: "var(--bg-primary)",
      }}
    >
      <Sidebar
        currentView={view}
        onViewChange={setView}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
      />

      <main
        className="app-main"
        style={{
          flex: 1,
          minWidth: 0,
          overflow: "auto",
          display: "flex",
          flexDirection: "column",
          background: "var(--bg-primary)",
        }}
      >
        {renderView()}
      </main>
    </div>
  );
}
