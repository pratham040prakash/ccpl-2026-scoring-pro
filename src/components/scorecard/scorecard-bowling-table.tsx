import type { ScorecardBowlerRow } from "@/lib/match/scorecard-analytics";
import { cn } from "@/lib/utils";

interface ScorecardBowlingTableProps {
  teamName: string;
  bowlers: ScorecardBowlerRow[];
}

export function ScorecardBowlingTable({ teamName, bowlers }: ScorecardBowlingTableProps) {
  if (bowlers.length === 0) return null;

  return (
    <div>
      <div className="border-b border-slate-200/60 bg-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-900/50">
        {teamName} Bowling
      </div>

      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm min-w-[680px]">
          <thead>
            <tr className="border-b border-slate-200/60 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-900/50">
              <th className="px-4 py-2 font-semibold">Bowler</th>
              <th className="px-2 py-2 text-right font-semibold">O</th>
              <th className="px-2 py-2 text-right font-semibold">M</th>
              <th className="px-2 py-2 text-right font-semibold">R</th>
              <th className="px-2 py-2 text-right font-semibold">W</th>
              <th className="px-2 py-2 text-right font-semibold">ECO</th>
              <th className="px-2 py-2 text-right font-semibold">Dots</th>
              <th className="px-2 py-2 text-right font-semibold">Wd</th>
              <th className="px-2 py-2 text-right font-semibold">Nb</th>
              <th className="px-2 py-2 text-right font-semibold">Avg</th>
              <th className="px-2 py-2 text-right font-semibold">SR</th>
            </tr>
          </thead>
          <tbody>
            {bowlers.map((b) => (
              <tr
                key={b.playerId}
                className={cn(
                  "border-b border-slate-100 last:border-0 dark:border-slate-800",
                  b.isCurrentBowler && "bg-primary/5"
                )}
              >
                <td className="px-4 py-3 font-medium text-primary">
                  {b.playerName}
                  {b.isCurrentBowler && (
                    <span className="ml-1 text-[10px] font-bold text-emerald-600">●</span>
                  )}
                </td>
                <td className="px-2 py-3 text-right">{b.overs}</td>
                <td className="px-2 py-3 text-right">{b.maidens}</td>
                <td className="px-2 py-3 text-right">{b.runs}</td>
                <td className="px-2 py-3 text-right font-semibold">{b.wickets}</td>
                <td className="px-2 py-3 text-right">{b.economy.toFixed(1)}</td>
                <td className="px-2 py-3 text-right">{b.dotBalls}</td>
                <td className="px-2 py-3 text-right">{b.wides}</td>
                <td className="px-2 py-3 text-right">{b.noBalls}</td>
                <td className="px-2 py-3 text-right">{b.average || "—"}</td>
                <td className="px-2 py-3 text-right">{b.bowlingStrikeRate || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="md:hidden divide-y divide-slate-200/40 dark:divide-slate-700/40">
        {bowlers.map((b) => (
          <div key={b.playerId} className="px-4 py-3">
            <div className="flex justify-between">
              <span className="font-semibold text-primary">
                {b.playerName}
                {b.isCurrentBowler && " ●"}
              </span>
              <span className="font-mono font-bold">
                {b.wickets}/{b.runs} ({b.overs})
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              ECO {b.economy.toFixed(1)} · Dots {b.dotBalls} · Wd {b.wides} · Nb {b.noBalls}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
