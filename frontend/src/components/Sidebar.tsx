import React, { useState, useEffect } from "react";
import {
  Mic,
  LayoutDashboard,
  FileText,
  CheckSquare,
  Settings,
  ChevronLeft,
  ChevronRight,
  Zap,
  Download,
  Wifi,
  WifiOff,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { AppView } from "../types";
import { useNetworkStatus } from "../lib/network";

interface SidebarProps {
  currentView: AppView;
  onViewChange: (v: AppView) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const NAV_ITEMS: { id: AppView; label: string; icon: React.ReactNode }[] = [
  { id: "voice", label: "Voice Assistant", icon: <Mic size={18} /> },
  { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
  { id: "notes", label: "Notes", icon: <FileText size={18} /> },
  { id: "tasks", label: "Tasks", icon: <CheckSquare size={18} /> },
  { id: "settings", label: "Settings", icon: <Settings size={18} /> },
];

export default function Sidebar({
  currentView,
  onViewChange,
  collapsed,
  onToggleCollapse,
}: SidebarProps) {
  const { isOnline } = useNetworkStatus();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setCanInstall(false);
    }
    setDeferredPrompt(null);
  };

  return (
    <motion.aside
      className="app-sidebar"
      animate={{ width: collapsed ? 64 : 240 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      style={{
        background: "var(--sidebar-bg)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        overflow: "visible",
        position: "relative",
        flexShrink: 0,
      }}
    >
      {/* Brand Header */}
      <div
        className="sidebar-brand"
        style={{
          padding: "1.25rem 1rem",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: "linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            boxShadow: "0 0 12px rgba(103, 232, 249, 0.4)",
          }}
        >
          <Zap size={18} color="#08090d" />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
              style={{
                fontSize: "1.1rem",
                fontWeight: 800,
                letterSpacing: "-0.03em",
                background: "linear-gradient(135deg, var(--accent-cyan), #ffffff)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                whiteSpace: "nowrap",
              }}
            >
              JARVIS<span style={{ color: "var(--accent-purple)" }}>//</span>PWA
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Nav items */}
      <nav className="sidebar-nav" style={{ padding: "0.5rem 0.5rem", flex: 1, marginTop: "0.5rem" }}>
        {NAV_ITEMS.map((item) => {
          const active = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                padding: collapsed ? "0.75rem" : "0.75rem 0.875rem",
                justifyContent: collapsed ? "center" : "flex-start",
                background: active ? "var(--nav-active)" : "transparent",
                borderLeft: active ? "3px solid var(--accent-cyan)" : "3px solid transparent",
                borderTop: "none",
                borderRight: "none",
                borderBottom: "none",
                borderRadius: "0 0.5rem 0.5rem 0",
                color: active ? "var(--accent-cyan)" : "var(--text-secondary)",
                cursor: "pointer",
                fontSize: "0.875rem",
                fontWeight: active ? 600 : 400,
                marginBottom: "0.25rem",
                transition: "all 0.15s",
              }}
            >
              {item.icon}
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    style={{ whiteSpace: "nowrap" }}
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          );
        })}
      </nav>

      {/* Bottom Status & Install PWA */}
      <div style={{ padding: "0.75rem", borderTop: "1px solid var(--border)" }}>
        {canInstall && !collapsed && (
          <button
            onClick={handleInstallClick}
            style={{
              width: "100%",
              padding: "0.5rem",
              borderRadius: "0.5rem",
              background: "linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))",
              color: "#08090d",
              fontWeight: 700,
              fontSize: "0.8rem",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.4rem",
              marginBottom: "0.5rem",
            }}
          >
            <Download size={14} /> Install PWA
          </button>
        )}

        {/* Online/Offline indicator */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            justifyContent: collapsed ? "center" : "flex-start",
            padding: "0.25rem",
            fontSize: "0.75rem",
            color: isOnline ? "var(--accent-cyan)" : "var(--accent-coral)",
          }}
        >
          {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
          {!collapsed && <span>{isOnline ? "Online Connected" : "Offline Storage"}</span>}
        </div>
      </div>

      {/* Collapse Toggle Button */}
      <button
        onClick={onToggleCollapse}
        style={{
          position: "absolute",
          top: "1.25rem",
          right: -14,
          width: 28,
          height: 28,
          borderRadius: "50%",
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          color: "var(--text-secondary)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          zIndex: 50,
          boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
        }}
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
    </motion.aside>
  );
}
