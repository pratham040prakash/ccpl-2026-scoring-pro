"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Bug } from "lucide-react";
import type { Ball, Innings, Match } from "@/types";
import { getScoringLogs, subscribeScoringLogs, type ScoringLogEntry } from "@/lib/live/scoring-logger";
import { isFirebaseConfigured } from "@/lib/firebase/config";

interface ScoringDebugPanelProps {
  matchId: string;
  match: Match | null;
  innings: Innings | null | undefined;
  balls: Ball[];
  userRole?: string;
  userId?: string;
  firestoreError?: string | null;
  ballsError?: string | null;
  networkOnline?: boolean;
  validationError?: string | null;
}

export function ScoringDebugPanel({
  matchId,
  match,
  innings,
  balls,
  userRole,
  userId,
  firestoreError,
  ballsError,
  networkOnline = true,
  validationError,
}: ScoringDebugPanelProps) {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<ScoringLogEntry[]>(getScoringLogs());

  useEffect(() => subscribeScoringLogs(setLogs), []);

  if (process.env.NODE_ENV === "production" && userRole !== "administrator") {
    return null;
  }

  const lastBall = balls[balls.length - 1];

  return (
    <div className="glass-card border border-purple-500/30 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-purple-200"
      >
        <span className="flex items-center gap-2">
          <Bug className="w-4 h-4" /> Scoring Debug
        </span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 text-xs font-mono text-slate-300 border-t border-purple-500/20">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
            <dt className="text-slate-500">Route matchId</dt>
            <dd>{matchId}</dd>
            <dt className="text-slate-500">Firestore matchId</dt>
            <dd>{match?.id ?? "—"}</dd>
            <dt className="text-slate-500">Innings ID</dt>
            <dd>{innings?.id ?? "—"}</dd>
            <dt className="text-slate-500">Innings #</dt>
            <dd>{innings?.inningsNumber ?? "—"}</dd>
            <dt className="text-slate-500">Over.Ball</dt>
            <dd>
              {innings != null
                ? `${innings.overs}.${innings.balls}`
                : "—"}
            </dd>
            <dt className="text-slate-500">Next sequence</dt>
            <dd>{innings?.nextSequence ?? balls.length}</dd>
            <dt className="text-slate-500">Striker</dt>
            <dd>{innings?.strikerId ?? "—"}</dd>
            <dt className="text-slate-500">Bowler</dt>
            <dd>{innings?.bowlerId ?? "—"}</dd>
            <dt className="text-slate-500">Firebase configured</dt>
            <dd>{isFirebaseConfigured() ? "yes" : "no"}</dd>
            <dt className="text-slate-500">Network</dt>
            <dd>{networkOnline ? "online" : "offline"}</dd>
            <dt className="text-slate-500">User role</dt>
            <dd>{userRole ?? "—"}</dd>
            <dt className="text-slate-500">User uid</dt>
            <dd className="truncate">{userId ?? "—"}</dd>
            <dt className="text-slate-500">Ball count</dt>
            <dd>{balls.length}</dd>
            <dt className="text-slate-500">Last ball</dt>
            <dd>{lastBall ? `${lastBall.runs}r seq ${lastBall.sequence}` : "—"}</dd>
            <dt className="text-slate-500">Score</dt>
            <dd>
              {innings ? `${innings.runs}/${innings.wickets}` : "—"}
            </dd>
            <dt className="text-slate-500">Match status</dt>
            <dd>{match?.status ?? "—"}</dd>
          </dl>

          {(validationError || firestoreError || ballsError) && (
            <div className="rounded bg-amber-500/10 border border-amber-500/30 p-2 text-amber-200">
              {validationError || firestoreError || ballsError}
            </div>
          )}

          <div>
            <p className="text-slate-500 mb-1">Recent events</p>
            <ul className="max-h-40 overflow-y-auto space-y-1">
              {logs.slice(0, 15).map((log) => (
                <li key={`${log.ts}-${log.event}`} className="text-[10px] leading-snug">
                  <span className="text-purple-300">{log.event}</span> {log.message}
                </li>
              ))}
              {logs.length === 0 && <li className="text-slate-500">No events yet</li>}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
