"use client";

import type { PointsTableEntry } from "@/types";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface PointsTableProps {
  entries: PointsTableEntry[];
  compact?: boolean;
}

function MobileStandingCard({
  entry,
  expanded,
  onToggle,
}: {
  entry: PointsTableEntry;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "w-full text-left p-4 rounded-xl border border-slate-200/20 transition-colors touch-target",
        entry.rank <= 8 && "bg-emerald-500/5 border-emerald-500/20",
        expanded && "ring-2 ring-primary/30"
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-8 h-8 rounded-full bg-primary/10 text-primary font-black text-sm flex items-center justify-center shrink-0">
            {entry.rank}
          </span>
          <span className="font-semibold truncate">{entry.teamName}</span>
        </div>
        <div className="text-right shrink-0">
          <p className="text-lg font-black">{entry.points}</p>
          <p className="text-[10px] uppercase text-slate-500">Pts</p>
        </div>
      </div>
      {expanded && (
        <div className="grid grid-cols-4 gap-2 mt-4 pt-3 border-t border-slate-200/10 text-center text-xs">
          <div>
            <p className="font-bold">{entry.played}</p>
            <p className="text-slate-500">P</p>
          </div>
          <div>
            <p className="font-bold text-emerald-500">{entry.won}</p>
            <p className="text-slate-500">W</p>
          </div>
          <div>
            <p className="font-bold text-red-400">{entry.lost}</p>
            <p className="text-slate-500">L</p>
          </div>
          <div>
            <p className={cn("font-bold font-mono", entry.nrr >= 0 ? "text-emerald-500" : "text-red-400")}>
              {entry.nrr >= 0 ? "+" : ""}
              {entry.nrr.toFixed(2)}
            </p>
            <p className="text-slate-500">NRR</p>
          </div>
        </div>
      )}
    </button>
  );
}

export function PointsTable({ entries, compact }: PointsTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="glass-card overflow-hidden">
      {/* Mobile card view */}
      <div className="md:hidden p-3 space-y-2">
        {entries.map((entry) => (
          <MobileStandingCard
            key={entry.teamId}
            entry={entry}
            expanded={expandedId === entry.teamId}
            onToggle={() =>
              setExpandedId((id) => (id === entry.teamId ? null : entry.teamId))
            }
          />
        ))}
      </div>

      {/* Desktop / tablet table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-[var(--card)]">
            <tr className="border-b border-slate-200/20 bg-primary/5">
              <th className="text-left p-3 font-semibold">#</th>
              <th className="text-left p-3 font-semibold">Team</th>
              <th className="text-center p-3 font-semibold">P</th>
              <th className="text-center p-3 font-semibold">W</th>
              <th className="text-center p-3 font-semibold">L</th>
              {!compact && <th className="text-center p-3 font-semibold">T</th>}
              <th className="text-center p-3 font-semibold">Pts</th>
              <th className="text-center p-3 font-semibold">NRR</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr
                key={entry.teamId}
                className={cn(
                  "border-b border-slate-200/10 hover:bg-slate-50/5 transition-colors",
                  entry.rank <= 8 && "bg-emerald-500/5"
                )}
              >
                <td className="p-3 font-bold text-primary">{entry.rank}</td>
                <td className="p-3 font-medium">{entry.teamName}</td>
                <td className="p-3 text-center">{entry.played}</td>
                <td className="p-3 text-center text-emerald-500">{entry.won}</td>
                <td className="p-3 text-center text-red-400">{entry.lost}</td>
                {!compact && <td className="p-3 text-center">{entry.tied}</td>}
                <td className="p-3 text-center font-bold">{entry.points}</td>
                <td
                  className={cn(
                    "p-3 text-center font-mono",
                    entry.nrr >= 0 ? "text-emerald-500" : "text-red-400"
                  )}
                >
                  {entry.nrr >= 0 ? "+" : ""}
                  {entry.nrr.toFixed(3)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500 p-3 border-t border-slate-200/10">
        Top 8 qualify · Points → NRR · Tap row on mobile for details
      </p>
    </div>
  );
}
