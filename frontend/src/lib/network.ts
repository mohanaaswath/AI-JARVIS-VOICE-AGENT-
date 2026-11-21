// network.ts — Reactive online/offline network detection
import { useState, useEffect } from "react";
import type { OperatingMode } from "../types";

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [reconnectedAt, setReconnectedAt] = useState<number | null>(null);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setReconnectedAt(Date.now());
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const mode: OperatingMode = isOnline ? "online" : "offline";

  return { isOnline, mode, reconnectedAt };
}
