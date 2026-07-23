"use client";

import type { PointsTableEntry } from "@/types";
import { cn } from "@/lib/utils";

interface PointsTableProps {
  entries: PointsTableEntry[];
  compact?: boolean;
}

export function PointsTable({ entries, compact }: PointsTableProps) {
  return (
    <div className="glass-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
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
                  "border-b border-slate-200/10 hover:bg-slate-50/5",
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
                <td className={cn("p-3 text-center font-mono", entry.nrr >= 0 ? "text-emerald-500" : "text-red-400")}>
                  {entry.nrr >= 0 ? "+" : ""}{entry.nrr.toFixed(3)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500 p-3 border-t border-slate-200/10">
        Top 8 qualify · Points → NRR → Runs Scored
      </p>
    </div>
  );
}
