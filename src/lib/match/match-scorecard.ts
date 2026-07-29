import type { Fixture, Innings, Match } from "@/types";
import type { StoredMatchScore } from "@/types/scores";
import { calculateRunRate, formatOvers } from "@/lib/utils";

const emptyExtras = () => ({
  total: 0,
  wides: 0,
  noBalls: 0,
  byes: 0,
  legByes: 0,
  penalty: 0,
});

const emptyPartnership = () => ({
  runs: 0,
  balls: 0,
  batsman1Id: "",
  batsman2Id: "",
  batsman1Runs: 0,
  batsman2Runs: 0,
});

export type ScorecardMode = "full" | "summary" | "live" | "pending";

export function buildMatchFromStoredScore(
  fixture: Fixture,
  score: StoredMatchScore
): Match {
  return {
    id: fixture.matchDocId ?? fixture.id,
    fixtureId: fixture.id,
    matchId: fixture.matchId,
    stage: fixture.stage,
    status: "completed",
    date: fixture.date,
    startTime: fixture.startTime,
    ground: fixture.ground,
    overs: fixture.overs,
    teamAId: score.teamAId,
    teamBId: score.teamBId,
    teamAName: score.teamAName,
    teamBName: score.teamBName,
    playingXiA: [],
    playingXiB: [],
    result: {
      winnerId: score.winnerId,
      winnerName: score.winnerName,
      margin: score.margin,
      marginType: score.marginType,
      summary: `${score.winnerName} won by ${score.margin}`,
    },
    locked: true,
    published: true,
    shareSlug: fixture.id,
    createdAt: score.updatedAt,
    updatedAt: score.updatedAt,
  };
}

export function buildInningsFromStoredScore(
  fixture: Fixture,
  score: StoredMatchScore
): Innings[] {
  const matchId = fixture.matchDocId ?? fixture.id;
  const now = score.updatedAt;

  const first: Innings = {
    id: `${fixture.id}-inn1`,
    matchId,
    teamId: score.teamAId,
    teamName: score.teamAName,
    inningsNumber: 1,
    runs: score.teamARuns,
    wickets: score.teamAWickets,
    overs: score.teamAOvers,
    balls: score.teamABalls,
    extras: emptyExtras(),
    runRate: calculateRunRate(score.teamARuns, score.teamAOvers, score.teamABalls),
    partnership: emptyPartnership(),
    completed: true,
    createdAt: now,
    updatedAt: now,
  };

  const second: Innings = {
    id: `${fixture.id}-inn2`,
    matchId,
    teamId: score.teamBId,
    teamName: score.teamBName,
    inningsNumber: 2,
    runs: score.teamBRuns,
    wickets: score.teamBWickets,
    overs: score.teamBOvers,
    balls: score.teamBBalls,
    extras: emptyExtras(),
    runRate: calculateRunRate(score.teamBRuns, score.teamBOvers, score.teamBBalls),
    partnership: emptyPartnership(),
    completed: true,
    createdAt: now,
    updatedAt: now,
  };

  return [first, second];
}

export function formatInningsScore(innings: Innings): string {
  const oversLabel = formatOvers(innings.overs, innings.balls);
  return `${innings.runs}-${innings.wickets} (${oversLabel} Ov)`;
}

export function inningsTabLabel(innings: Innings): string {
  const short = innings.teamName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
  const ord = innings.inningsNumber === 1 ? "1st" : "2nd";
  return `${short || innings.teamName.slice(0, 3).toUpperCase()} (${ord} Inn)`;
}

export function formatExtrasBreakdown(extras: Innings["extras"]): string {
  return `(b ${extras.byes}, lb ${extras.legByes}, w ${extras.wides}, nb ${extras.noBalls}, p ${extras.penalty})`;
}

export function formatBowlerOvers(balls: number): string {
  return formatOvers(Math.floor(balls / 6), balls % 6);
}

export function resolveScorecardMode(options: {
  fixtureStatus?: string;
  storedScore?: StoredMatchScore | null;
  firestoreInningsCount: number;
  hasBallByBall: boolean;
}): ScorecardMode {
  if (options.fixtureStatus === "live") return "live";
  if (options.hasBallByBall && options.firestoreInningsCount >= 2) return "full";
  if (options.storedScore || options.fixtureStatus === "completed") return "summary";
  if (options.firestoreInningsCount > 0) return "live";
  return "pending";
}
