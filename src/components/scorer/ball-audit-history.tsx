"use client";

import { useEffect, useState } from "react";
import type { Ball, BallAuditEntry } from "@/types";
import { getAuditLog } from "@/lib/firebase/firestore";
import { formatOverLabel } from "@/lib/engine/innings-metrics";

function ballSummary(ball?: Ball): string {
  if (!ball) return "—";
  if (ball.isWicket) return `W (${ball.runs}r)`;
  if (ball.extra) return `${ball.extra} ${ball.runs}r`;
  return ball.runs === 0 ? "dot" : `${ball.runs} runs`;
}

interface BallAuditHistoryProps {
  matchId: string;
  refreshKey?: number;
}

export function BallAuditHistory({ matchId, refreshKey = 0 }: BallAuditHistoryProps) {
  const [entries, setEntries] = useState<BallAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getAuditLog(matchId)
      .then((rows) => {
        if (!cancelled) setEntries(rows);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [matchId, refreshKey]);

  const corrections = entries.filter(
    (e) => e.action === "edit" || e.action === "delete" || e.action === "undo" || e.action === "restore"
  );

  return (
    <div className="glass-card p-4">
      <h4 className="text-xs uppercase tracking-wider text-slate-500 mb-3">
        Ball correction history
      </h4>
      {loading && <p className="text-sm text-slate-500">Loading audit log…</p>}
      {!loading && corrections.length === 0 && (
        <p className="text-sm text-slate-500">No corrections recorded yet.</p>
      )}
      {!loading && corrections.length > 0 && (
        <ul className="space-y-3 max-h-64 overflow-y-auto text-sm">
          {corrections.map((entry) => (
            <li
              key={entry.id}
              className="border border-slate-700/50 rounded-lg p-3 bg-slate-900/40"
            >
              <div className="flex flex-wrap justify-between gap-2 text-xs text-slate-400">
                <span className="uppercase font-semibold text-purple-300">{entry.action}</span>
                <span>{new Date(entry.timestamp).toLocaleString()}</span>
              </div>
              <p className="mt-1 font-mono">
                Over {entry.overLabel} · seq {entry.sequence}
              </p>
              {entry.action === "edit" && (
                <p className="mt-1">
                  <span className="text-red-300">{ballSummary(entry.originalBall)}</span>
                  {" → "}
                  <span className="text-emerald-300">{ballSummary(entry.updatedBall)}</span>
                </p>
              )}
              {entry.reason && (
                <p className="mt-1 text-slate-300">
                  <span className="text-slate-500">Reason:</span> {entry.reason}
                </p>
              )}
              <p className="mt-1 text-xs text-slate-500">
                By {entry.createdByEmail ?? entry.createdBy}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function formatBallForPicker(ball: Ball): string {
  return `${formatOverLabel(ball.overNumber, ball.ballNumber)} · ${ballSummary(ball)}`;
}
