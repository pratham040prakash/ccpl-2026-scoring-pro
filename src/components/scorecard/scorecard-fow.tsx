import type { FallOfWicketRow } from "@/lib/match/scorecard-analytics";

export function ScorecardFallOfWickets({ rows }: { rows: FallOfWicketRow[] }) {
  if (rows.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200/60 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700">
            <th className="px-4 py-2">#</th>
            <th className="px-2 py-2">Score</th>
            <th className="px-2 py-2">Batter</th>
            <th className="px-2 py-2">Over</th>
            <th className="px-2 py-2">Dismissal</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.wicketNumber} className="border-b border-slate-100 dark:border-slate-800">
              <td className="px-4 py-2">{row.wicketNumber}</td>
              <td className="px-2 py-2 font-mono font-semibold">{row.score}</td>
              <td className="px-2 py-2">{row.batter}</td>
              <td className="px-2 py-2 font-mono">{row.over}</td>
              <td className="px-2 py-2 text-slate-500">{row.dismissal}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
