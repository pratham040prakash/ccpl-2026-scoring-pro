import type { PartnershipRow } from "@/lib/match/scorecard-analytics";

export function ScorecardPartnerships({
  rows,
  highest,
}: {
  rows: PartnershipRow[];
  highest: PartnershipRow | null;
}) {
  if (rows.length === 0) return null;

  return (
    <div className="space-y-4 p-4">
      {highest && (
        <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-sm">
          <span className="font-semibold text-amber-800 dark:text-amber-200">Highest Partnership: </span>
          {highest.runs} ({highest.balls} balls) — {highest.player1} & {highest.player2}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200/60 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700">
              <th className="px-2 py-2">Wkt</th>
              <th className="px-2 py-2">Runs</th>
              <th className="px-2 py-2">Balls</th>
              <th className="px-2 py-2">Players</th>
              <th className="px-2 py-2">Split</th>
              <th className="px-2 py-2">Min</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.wicketNumber} className="border-b border-slate-100 dark:border-slate-800">
                <td className="px-2 py-2">{row.wicketNumber}</td>
                <td className="px-2 py-2 font-semibold">{row.runs}</td>
                <td className="px-2 py-2">{row.balls}</td>
                <td className="px-2 py-2">
                  {row.player1} & {row.player2}
                </td>
                <td className="px-2 py-2 text-slate-500">
                  {row.player1Runs} + {row.player2Runs}
                </td>
                <td className="px-2 py-2">{row.durationMinutes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
