import type { Innings } from "@/types";
import { cn } from "@/lib/utils";
import { inningsTabLabel } from "@/lib/match/match-scorecard";

interface InningsTabsProps {
  innings: Innings[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function InningsTabs({ innings, selectedId, onSelect }: InningsTabsProps) {
  if (innings.length < 2) return null;

  return (
    <div className="flex gap-2 flex-wrap">
      {innings.map((inn) => {
        const active = inn.id === selectedId;
        return (
          <button
            key={inn.id}
            type="button"
            onClick={() => onSelect(inn.id)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-semibold transition-colors",
              active
                ? "bg-emerald-700 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
            )}
          >
            {inningsTabLabel(inn)}
          </button>
        );
      })}
    </div>
  );
}
