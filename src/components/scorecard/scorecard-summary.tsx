import type { Innings, Match } from "@/types";
import { inningsRunRate, inningsScoreLine } from "@/lib/match/scorecard-analytics";

interface ScorecardSummaryProps {
  match: Match;
  innings: Innings[];
  currentInnings?: Innings;
  target?: number;
}

export function ScorecardSummary({ match, innings, currentInnings, target }: ScorecardSummaryProps) {
  const active = currentInnings ?? innings.at(-1);
  if (!active) return null;

  const bowlingTeam =
    active.teamId === match.teamAId ? match.teamBName : match.teamAName;

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <SummaryTile label="Batting" value={active.teamName} />
      <SummaryTile label="Bowling" value={bowlingTeam} />
      <SummaryTile
        label="Score"
        value={inningsScoreLine(active)}
        sub={`RR ${inningsRunRate(active).toFixed(2)}`}
      />
      <SummaryTile label="Wickets" value={String(active.wickets)} />
      {target != null && (
        <SummaryTile label="Target" value={String(target)} highlight />
      )}
      {match.result?.winnerName && (
        <>
          <SummaryTile label="Winner" value={match.result.winnerName} highlight />
          <SummaryTile label="Margin" value={match.result.margin} />
        </>
      )}
    </div>
  );
}

function SummaryTile({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div className="glass-card p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">{label}</p>
      <p className={`font-bold ${highlight ? "text-primary" : ""}`}>{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}
