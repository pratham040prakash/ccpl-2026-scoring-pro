import type { BowlerScore } from "@/types";
import { formatBowlerOvers } from "@/lib/match/match-scorecard";

interface BowlingScorecardTableProps {
  teamName: string;
  bowlers: BowlerScore[];
}

export function BowlingScorecardTable({ teamName, bowlers }: BowlingScorecardTableProps) {
  if (bowlers.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200/60 dark:border-slate-700/60">
      <div className="border-b border-slate-200/60 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-900/50">
        {teamName} Bowling
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200/60 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-900/50">
            <th className="px-4 py-2 font-semibold">Bowler</th>
            <th className="px-2 py-2 text-right font-semibold">O</th>
            <th className="px-2 py-2 text-right font-semibold">R</th>
            <th className="px-2 py-2 text-right font-semibold">W</th>
            <th className="px-2 py-2 text-right font-semibold">ECO</th>
          </tr>
        </thead>
        <tbody>
          {bowlers.map((bowler) => (
            <tr
              key={bowler.playerId}
              className="border-b border-slate-100 last:border-0 dark:border-slate-800"
            >
              <td className="px-4 py-3 font-medium text-primary">{bowler.playerName}</td>
              <td className="px-2 py-3 text-right">{formatBowlerOvers(bowler.balls)}</td>
              <td className="px-2 py-3 text-right">{bowler.runs}</td>
              <td className="px-2 py-3 text-right font-semibold">{bowler.wickets}</td>
              <td className="px-2 py-3 text-right">{bowler.economy.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
