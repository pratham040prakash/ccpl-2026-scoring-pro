import type { Match } from "@/types";

export function MatchResultBanner({ match }: { match: Match }) {
  if (!match.result?.winnerName) return null;

  return (
    <div className="rounded-xl bg-slate-100 dark:bg-slate-800/80 px-4 py-3 text-center text-sm font-medium text-slate-700 dark:text-slate-200">
      {match.result.summary || `${match.result.winnerName} won by ${match.result.margin}`}
    </div>
  );
}
