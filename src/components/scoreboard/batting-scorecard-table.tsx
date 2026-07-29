import type { BatterScore, Innings } from "@/types";
import { formatExtrasBreakdown } from "@/lib/match/match-scorecard";
import { calculateRunRate } from "@/lib/utils";

interface BattingScorecardTableProps {
  innings: Innings;
  batters: BatterScore[];
  showPlayerDetail: boolean;
}

export function BattingScorecardTable({
  innings,
  batters,
  showPlayerDetail,
}: BattingScorecardTableProps) {
  const rr = calculateRunRate(innings.runs, innings.overs, innings.balls);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200/60 dark:border-slate-700/60">
      <div className="flex items-center justify-between bg-emerald-700 px-4 py-3 text-white">
        <span className="font-semibold">{innings.teamName}</span>
        <span className="font-mono font-bold">
          {innings.runs}-{innings.wickets} ({innings.overs}.{innings.balls} Ov)
        </span>
      </div>

      {showPlayerDetail && batters.length > 0 ? (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200/60 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-900/50">
              <th className="px-4 py-2 font-semibold">Batter</th>
              <th className="px-2 py-2 text-right font-semibold">R</th>
              <th className="px-2 py-2 text-right font-semibold">B</th>
              <th className="px-2 py-2 text-right font-semibold">4s</th>
              <th className="px-2 py-2 text-right font-semibold">6s</th>
              <th className="px-2 py-2 text-right font-semibold">SR</th>
            </tr>
          </thead>
          <tbody>
            {batters.map((batter) => (
              <tr
                key={batter.playerId}
                className="border-b border-slate-100 last:border-0 dark:border-slate-800"
              >
                <td className="px-4 py-3">
                  <div className="font-medium text-primary">{batter.playerName}</div>
                  {batter.isOut && batter.dismissal && (
                    <div className="text-xs text-slate-500">{batter.dismissal}</div>
                  )}
                  {!batter.isOut && batter.balls > 0 && (
                    <div className="text-xs text-slate-500">not out</div>
                  )}
                </td>
                <td className="px-2 py-3 text-right font-semibold">{batter.runs}</td>
                <td className="px-2 py-3 text-right">{batter.balls}</td>
                <td className="px-2 py-3 text-right">{batter.fours}</td>
                <td className="px-2 py-3 text-right">{batter.sixes}</td>
                <td className="px-2 py-3 text-right">{batter.strikeRate.toFixed(1)}</td>
              </tr>
            ))}
            <tr className="border-t border-slate-200 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-900/30">
              <td className="px-4 py-2 text-slate-600 dark:text-slate-300">
                Extras <span className="text-xs">{formatExtrasBreakdown(innings.extras)}</span>
              </td>
              <td className="px-2 py-2 text-right font-semibold" colSpan={5}>
                {innings.extras.total}
              </td>
            </tr>
            <tr className="bg-slate-50/80 dark:bg-slate-900/30">
              <td className="px-4 py-2 font-semibold">Total</td>
              <td className="px-2 py-2 text-right font-bold" colSpan={5}>
                {innings.runs}/{innings.wickets} ({innings.overs}.{innings.balls} Ov) · RR:{" "}
                {rr.toFixed(1)}
              </td>
            </tr>
          </tbody>
        </table>
      ) : (
        <div className="px-4 py-6 text-center text-sm text-slate-500">
          <p className="font-mono text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">
            {innings.runs}/{innings.wickets}
          </p>
          <p>
            {innings.overs}.{innings.balls} overs · RR {rr.toFixed(1)}
          </p>
          <p className="mt-3 text-xs">
            Player-by-player scorecard is not available for this match.
          </p>
        </div>
      )}
    </div>
  );
}
