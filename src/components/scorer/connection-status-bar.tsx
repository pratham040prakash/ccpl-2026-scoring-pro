"use client";

import type { ConnectionState } from "@/hooks/use-connection-status";

const LABEL: Record<ConnectionState, string> = {
  connected: "Connected",
  syncing: "Syncing",
  offline: "Offline",
};

const DOT: Record<ConnectionState, string> = {
  connected: "bg-emerald-500",
  syncing: "bg-amber-400 animate-pulse",
  offline: "bg-red-500",
};

interface ConnectionStatusBarProps {
  state: ConnectionState;
  pendingCount: number;
  lastSyncAt?: string | null;
}

export function ConnectionStatusBar({ state, pendingCount, lastSyncAt }: ConnectionStatusBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs">
      <span className="inline-flex items-center gap-1.5 font-medium">
        <span className={`w-2 h-2 rounded-full ${DOT[state]}`} aria-hidden />
        {LABEL[state]}
      </span>
      {pendingCount > 0 && (
        <span className="text-amber-300">{pendingCount} pending in queue</span>
      )}
      {lastSyncAt && state === "connected" && (
        <span className="text-slate-500">
          Last sync {new Date(lastSyncAt).toLocaleTimeString()}
        </span>
      )}
    </div>
  );
}
