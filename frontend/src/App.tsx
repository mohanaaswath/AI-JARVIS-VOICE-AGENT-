import { useState } from "react";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import ChatView from "./components/ChatView";
import VoiceView from "./components/VoiceView";
import SettingsView from "./components/SettingsView";
import type { AppView } from "./types";

export default function App() {
  const [view, setView] = useState<AppView>("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => window.innerWidth <= 640
  );

  const renderView = () => {
    switch (view) {
      case "dashboard":
        return <Dashboard onNavigate={setView} />;
      case "chat":
        return <ChatView />;
      case "voice":
        return <VoiceView />;
      case "settings":
        return <SettingsView />;
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
        style={{
          flex: 1,
          minWidth: 0,
          overflow: "auto",
          display: "flex",
          flexDirection: "column",
          background:
            "radial-gradient(ellipse at top left, rgba(139,92,246,0.04) 0%, transparent 60%), var(--bg-primary)",
        }}
      >
        {renderView()}
      </main>
    </div>
  );
}
