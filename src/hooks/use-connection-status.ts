"use client";

import { useCallback, useEffect, useState } from "react";
import { getPendingActions, isOnline } from "@/lib/offline/store";

export type ConnectionState = "connected" | "syncing" | "offline";

export function useConnectionStatus(matchId?: string) {
  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);

  const refreshPending = useCallback(async () => {
    const rows = await getPendingActions(matchId);
    setPendingCount(rows.length);
  }, [matchId]);

  useEffect(() => {
    const refreshOnline = async () => setOnline(await isOnline());
    refreshOnline();
    refreshPending();

    const onOnline = () => {
      setOnline(true);
      setSyncing(true);
      void refreshPending().finally(() => {
        setSyncing(false);
        setLastSyncAt(new Date().toISOString());
      });
    };
    const onOffline = () => {
      setOnline(false);
      setSyncing(false);
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    const timer = window.setInterval(refreshPending, 5000);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.clearInterval(timer);
    };
  }, [matchId, refreshPending]);

  const state: ConnectionState = !online
    ? "offline"
    : syncing || pendingCount > 0
      ? "syncing"
      : "connected";

  return { state, online, syncing, pendingCount, lastSyncAt, refreshPending };
}
