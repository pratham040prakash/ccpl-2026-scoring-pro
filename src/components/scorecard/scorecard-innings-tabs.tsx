"use client";

import type { Innings } from "@/types";
import { inningsTabLabel, formatInningsScore } from "@/lib/match/match-scorecard";
import { cn } from "@/lib/utils";

interface ScorecardInningsTabsProps {
  innings: Innings[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function ScorecardInningsTabs({ innings, selectedId, onSelect }: ScorecardInningsTabsProps) {
  if (innings.length <= 1) return null;

  return (
    <div className="sticky top-16 z-30 bg-background/95 backdrop-blur border-b border-slate-200/40 dark:border-slate-700/40 -mx-4 px-4 py-2 sm:static sm:mx-0 sm:px-0 sm:border-0 sm:bg-transparent sm:backdrop-blur-none">
      <div className="flex gap-2 overflow-x-auto">
        {innings.map((inn) => {
          const active = inn.id === selectedId;
          return (
            <button
              key={inn.id}
              type="button"
              onClick={() => onSelect(inn.id)}
              className={cn(
                "shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                active
                  ? "bg-primary text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
              )}
            >
              <span className="block">{inningsTabLabel(inn)}</span>
              <span className={cn("block text-xs font-mono mt-0.5", active ? "opacity-90" : "opacity-70")}>
                {formatInningsScore(inn)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
