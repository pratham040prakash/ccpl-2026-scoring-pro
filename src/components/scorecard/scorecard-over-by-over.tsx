import type { OverSummaryRow } from "@/lib/match/scorecard-analytics";

export function ScorecardOverByOver({ overs }: { overs: OverSummaryRow[] }) {
  if (overs.length === 0) return null;

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
      {overs.map((over) => (
        <div
          key={over.overNumber}
          className="rounded-lg border border-slate-200/60 dark:border-slate-700/60 p-3"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase text-slate-500">
              Over {over.overNumber + 1}
            </span>
            <span className="font-mono font-bold text-primary">
              {over.runs} run{over.runs === 1 ? "" : "s"}
              {over.wickets > 0 ? ` · ${over.wickets}W` : ""}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {over.balls.map((ball, i) => (
              <span
                key={`${over.overNumber}-${i}`}
                className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full px-1 text-xs font-bold ${
                  ball === "W"
                    ? "bg-red-500 text-white"
                    : ball === "6" || ball.endsWith("6")
                      ? "bg-purple-600 text-white"
                      : ball === "4" || ball.endsWith("4")
                        ? "bg-blue-500 text-white"
                        : ball === "•"
                          ? "bg-slate-600 text-white"
                          : ball.includes("Wd") || ball.includes("Nb")
                            ? "bg-amber-500 text-white"
                            : "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-white"
                }`}
              >
                {ball}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
