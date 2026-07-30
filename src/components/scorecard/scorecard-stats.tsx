import type { InningsAnalytics, MatchAnalytics } from "@/lib/match/scorecard-analytics";

export function ScorecardMatchStats({
  innings,
  matchStats,
}: {
  innings: InningsAnalytics;
  matchStats: MatchAnalytics | null;
}) {
  const items = [
    { label: "Dot Ball %", value: `${innings.dotBallPct}%` },
    { label: "Boundary %", value: `${innings.boundaryPct}%` },
    { label: "Powerplay", value: String(innings.powerplayRuns) },
    { label: "Death Overs", value: String(innings.deathOversRuns) },
    matchStats?.mostSixes && {
      label: "Most Sixes",
      value: `${matchStats.mostSixes.name} (${matchStats.mostSixes.count})`,
    },
    matchStats?.mostFours && {
      label: "Most Fours",
      value: `${matchStats.mostFours.name} (${matchStats.mostFours.count})`,
    },
    matchStats?.bestBatter && {
      label: "Best Batter",
      value: `${matchStats.bestBatter.name} ${matchStats.bestBatter.runs} (${matchStats.bestBatter.balls})`,
    },
    matchStats?.bestBowler && {
      label: "Best Bowler",
      value: `${matchStats.bestBowler.name} ${matchStats.bestBowler.figures}`,
    },
    matchStats?.totalDotBalls != null && {
      label: "Total Dots",
      value: String(matchStats.totalDotBalls),
    },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 p-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg bg-slate-50 dark:bg-slate-900/40 p-3">
          <p className="text-[10px] uppercase tracking-wide text-slate-500">{item.label}</p>
          <p className="font-semibold text-sm mt-1">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

export function ScorecardRunDistribution({
  distribution,
}: {
  distribution: InningsAnalytics["runDistribution"];
}) {
  const rows = [
    { label: "Singles", value: distribution.singles },
    { label: "Doubles", value: distribution.doubles },
    { label: "Triples", value: distribution.triples },
    { label: "Fours", value: distribution.fours },
    { label: "Sixes", value: distribution.sixes },
    { label: "Dots", value: distribution.dots },
    { label: "Extras", value: distribution.extras },
  ];

  return (
    <div className="grid grid-cols-3 sm:grid-cols-7 gap-2 p-4">
      {rows.map((row) => (
        <div key={row.label} className="text-center rounded-lg border border-slate-200/60 dark:border-slate-700/60 py-3">
          <p className="text-2xl font-black text-primary">{row.value}</p>
          <p className="text-xs text-slate-500 mt-1">{row.label}</p>
        </div>
      ))}
    </div>
  );
}
