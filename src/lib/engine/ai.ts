import type { BatterScore, BowlerScore, Innings, Match } from "@/types";

export function generateMatchSummary(
  match: Match,
  innings: Innings[],
  batters: BatterScore[],
  bowlers: BowlerScore[]
): string {
  const inn1 = innings.find((i) => i.inningsNumber === 1);
  const inn2 = innings.find((i) => i.inningsNumber === 2);

  const lines: string[] = [
    `## ${match.teamAName} vs ${match.teamBName}`,
    `**${match.stage.replace(/_/g, " ").toUpperCase()}** · ${match.ground}`,
    "",
  ];

  if (inn1) {
    lines.push(`**${inn1.teamName}:** ${inn1.runs}/${inn1.wickets} (${inn1.overs}.${inn1.balls} ov)`);
  }
  if (inn2) {
    lines.push(`**${inn2.teamName}:** ${inn2.runs}/${inn2.wickets} (${inn2.overs}.${inn2.balls} ov)`);
  }

  if (match.result) {
    lines.push("", `**Result:** ${match.result.winnerName} won by ${match.result.margin}`);
  }

  const topBatter = batters[0];
  if (topBatter) {
    lines.push("", `**Top Batter:** ${topBatter.playerName} — ${topBatter.runs} (${topBatter.balls})`);
  }

  const topBowler = bowlers[0];
  if (topBowler && topBowler.wickets > 0) {
    lines.push(`**Top Bowler:** ${topBowler.playerName} — ${topBowler.wickets}/${topBowler.runs}`);
  }

  lines.push("", generateNarrative(match, innings));

  return lines.join("\n");
}

function generateNarrative(match: Match, innings: Innings[]): string {
  if (!match.result) {
    return "Match in progress. Stay tuned for live updates.";
  }

  const winner = match.result.winnerName;
  const margin = match.result.margin;
  const totalRuns = innings.reduce((s, i) => s + i.runs, 0);

  return (
    `${winner} secured a ${margin} victory in this ${match.overs}-over contest. ` +
    `The match produced ${totalRuns} runs across both innings. ` +
    `${match.tossWinnerId ? "The toss played a crucial role in setting up the chase." : ""} ` +
    `A competitive encounter that kept spectators engaged throughout.`
  );
}

export function generatePlayerInsight(
  name: string,
  runs: number,
  balls: number,
  wickets: number,
  matches: number
): string {
  const insights: string[] = [];

  if (runs > 0) {
    const sr = balls > 0 ? ((runs / balls) * 100).toFixed(1) : "0";
    insights.push(`${name} has scored ${runs} runs at a strike rate of ${sr}.`);
    if (runs >= 100) insights.push("Outstanding tournament with a century!");
    else if (runs >= 50) insights.push("Consistent performer with a fifty.");
  }

  if (wickets > 0) {
    insights.push(`${name} has taken ${wickets} wickets in ${matches} matches.`);
    if (wickets >= 5) insights.push("Leading wicket-taker — key asset for the team.");
  }

  if (insights.length === 0) {
    return `${name} is yet to make a major impact this tournament.`;
  }

  return insights.join(" ");
}

export function predictMatchOutcome(
  chasingRuns: number,
  chasingWickets: number,
  chasingOvers: number,
  chasingBalls: number,
  target: number,
  maxOvers: number
): { winnerProb: number; prediction: string; confidence: number } {
  const ballsRemaining = maxOvers * 6 - (chasingOvers * 6 + chasingBalls);
  const runsNeeded = target - chasingRuns;

  if (runsNeeded <= 0) {
    return { winnerProb: 92, prediction: "Batting team favorites", confidence: 85 };
  }
  if (ballsRemaining <= 0 || chasingWickets >= 10) {
    return { winnerProb: 8, prediction: "Bowling team favorites", confidence: 90 };
  }

  const requiredRR = (runsNeeded / ballsRemaining) * 6;
  const currentRR = (chasingOvers * 6 + chasingBalls) > 0
    ? (chasingRuns / (chasingOvers * 6 + chasingBalls)) * 6
    : 6;

  let prob = 50 + (currentRR - requiredRR) * 10 - chasingWickets * 5;
  prob = Math.max(5, Math.min(95, prob));

  const prediction =
    prob > 60
      ? "Chasing team has the edge"
      : prob < 40
        ? "Defending team in control"
        : "Evenly poised contest";

  return {
    winnerProb: Math.round(prob),
    prediction,
    confidence: Math.round(60 + Math.abs(prob - 50) * 0.6),
  };
}

export function generateBestXI(
  players: { name: string; runs: number; wickets: number; mvp: number; role: string }[]
): { name: string; role: string; reason: string }[] {
  const sorted = [...players].sort((a, b) => b.mvp - a.mvp);
  const xi: { name: string; role: string; reason: string }[] = [];
  const roles = { batsman: 0, bowler: 0, all_rounder: 0, wicket_keeper: 0 };

  for (const p of sorted) {
    if (xi.length >= 11) break;
    const role = p.role as keyof typeof roles;
    if (role === "wicket_keeper" && roles.wicket_keeper >= 1) continue;
    if (role === "bowler" && roles.bowler >= 4) continue;
    if (role === "batsman" && roles.batsman >= 5) continue;

    xi.push({
      name: p.name,
      role: p.role,
      reason: `${p.runs} runs, ${p.wickets} wickets`,
    });
    if (role in roles) roles[role]++;
  }

  return xi;
}

export function generatePerformanceTrend(
  recentScores: number[]
): { trend: "up" | "down" | "stable"; summary: string } {
  if (recentScores.length < 2) {
    return { trend: "stable", summary: "Insufficient data for trend analysis." };
  }

  const recent = recentScores.slice(-3);
  const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const prev = recentScores.slice(0, -1);
  const prevAvg = prev.length ? prev.reduce((a, b) => a + b, 0) / prev.length : avg;

  if (avg > prevAvg * 1.2) {
    return { trend: "up", summary: `Form trending up — averaging ${avg.toFixed(0)} in recent innings.` };
  }
  if (avg < prevAvg * 0.8) {
    return { trend: "down", summary: `Form dipping — recent average ${avg.toFixed(0)} runs.` };
  }
  return { trend: "stable", summary: `Consistent form — averaging ${avg.toFixed(0)} runs.` };
}
