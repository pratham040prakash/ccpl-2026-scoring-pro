"use client";

import type { Ball, Innings, Match } from "@/types";
import { ConnectionStatusBar } from "@/components/scorer/connection-status-bar";
import type { ConnectionState } from "@/hooks/use-connection-status";
import type { ScoringSession } from "@/types";
import { subscribeScoringLogs, type ScoringLogEntry } from "@/lib/live/scoring-logger";
import { useEffect, useState } from "react";

interface MatchHealthPanelProps {
  matchId: string;
  match: Match | null;
  innings: Innings | null;
  balls: Ball[];
  connectionState: ConnectionState;
  pendingCount: number;
  lastSyncAt?: string | null;
  firestoreError?: string | null;
  ballsError?: string | null;
  scoringReadOnly?: boolean;
  lockHolder?: ScoringSession | null;
  networkOnline: boolean;
}

export function MatchHealthPanel({
  matchId,
  match,
  innings,
  balls,
  connectionState,
  pendingCount,
  lastSyncAt,
  firestoreError,
  ballsError,
  scoringReadOnly,
  lockHolder,
  networkOnline,
}: MatchHealthPanelProps) {
  const [logs, setLogs] = useState<ScoringLogEntry[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => subscribeScoringLogs(setLogs), []);

  const issues = [firestoreError, ballsError].filter(Boolean);

  return (
    <div className="glass-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Match health</h3>
        <button type="button" className="text-xs text-slate-400" onClick={() => setOpen(!open)}>
          {open ? "Hide" : "Details"}
        </button>
      </div>

      <ConnectionStatusBar
        state={connectionState}
        pendingCount={pendingCount}
        lastSyncAt={lastSyncAt}
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <Stat label="Firestore" value={issues.length ? "Error" : "OK"} bad={issues.length > 0} />
        <Stat label="Listeners" value={ballsError ? "Balls error" : "Active"} bad={Boolean(ballsError)} />
        <Stat label="Pending writes" value={String(pendingCount)} bad={pendingCount > 0} />
        <Stat label="Scorer mode" value={scoringReadOnly ? "Read only" : "Active"} bad={scoringReadOnly} />
      </div>

      {lockHolder && scoringReadOnly && (
        <p className="text-xs text-amber-300">
          Locked by {lockHolder.displayName ?? lockHolder.email ?? lockHolder.uid}
        </p>
      )}

      {open && (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-400">
          <div>Match ID</div>
          <div className="font-mono text-slate-200 truncate">{matchId}</div>
          <div>Innings</div>
          <div className="font-mono text-slate-200">{innings?.id ?? "—"}</div>
          <div>Ball count</div>
          <div className="text-slate-200">{balls.length}</div>
          <div>Network</div>
          <div className="text-slate-200">{networkOnline ? "Online" : "Offline"}</div>
          <div>Match status</div>
          <div className="text-slate-200">{match?.status ?? "—"}</div>
          <div>Locked</div>
          <div className="text-slate-200">{match?.locked ? "Yes" : "No"}</div>
        </dl>
      )}

      {issues.length > 0 && (
        <div className="text-xs text-red-400 space-y-1">
          {issues.map((msg) => (
            <p key={msg}>{msg}</p>
          ))}
        </div>
      )}

      {open && logs.length > 0 && (
        <ul className="max-h-32 overflow-y-auto text-xs font-mono text-slate-500 space-y-1">
          {logs.slice(-8).map((entry, i) => (
            <li key={`${entry.ts}-${i}`}>
              {new Date(entry.ts).toLocaleTimeString()} · {entry.event} · {entry.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Stat({ label, value, bad }: { label: string; value: string; bad?: boolean }) {
  return (
    <div className={`rounded-lg px-2 py-1.5 ${bad ? "bg-red-500/10 text-red-300" : "bg-slate-800/60 text-slate-200"}`}>
      <div className="text-slate-500">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}
