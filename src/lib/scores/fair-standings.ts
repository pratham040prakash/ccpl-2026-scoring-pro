import type { Fixture, Match, PointsTableEntry, Team } from "@/types";
import type { StoredMatchScore } from "@/types/scores";
import { rankTeams } from "@/lib/engine/tournament";
import { buildMatchesFromScores } from "@/lib/scores/matches-from-scores";
import { buildPointsTableFromScores } from "@/lib/scores/store";

function scoresForFixtures(
  scores: Record<string, StoredMatchScore>,
  fixtures: Fixture[]
): Record<string, StoredMatchScore> {
  const ids = new Set(fixtures.map((fixture) => fixture.id));
  const filtered: Record<string, StoredMatchScore> = {};
  for (const [key, score] of Object.entries(scores)) {
    if (ids.has(key) || ids.has(score.fixtureId)) {
      filtered[key] = score;
    }
  }
  return filtered;
}

function r2MatchById(matches: Match[], matchId: string): Match | undefined {
  return matches.find((match) => match.matchId.toUpperCase() === matchId.toUpperCase());
}

/**
 * Round 2 decides 7th and 8th QF spots only — no extra league points.
 * R2-2 winner → 7th, R2-1 winner → 8th; R2 losers follow by R1 rank.
 */
export function applyRound2QualificationPlacement(
  r1Table: PointsTableEntry[],
  r2Matches: Match[]
): PointsTableEntry[] {
  const r2_1 = r2MatchById(r2Matches, "R2-1");
  const r2_2 = r2MatchById(r2Matches, "R2-2");
  if (!r2_1?.result?.winnerId || !r2_2?.result?.winnerId) {
    return r1Table;
  }

  const byId = new Map(r1Table.map((entry) => [entry.teamId, entry]));
  const r1Rank = new Map(r1Table.map((entry) => [entry.teamId, entry.rank]));

  const seventhId = r2_2.result.winnerId;
  const eighthId = r2_1.result.winnerId;
  const seventh = byId.get(seventhId);
  const eighth = byId.get(eighthId);
  if (!seventh || !eighth) return r1Table;

  const loserId = (match: Match) =>
    match.result!.winnerId === match.teamAId ? match.teamBId : match.teamAId;

  const r2Losers = [r2_1, r2_2]
    .map(loserId)
    .sort((a, b) => (r1Rank.get(a) ?? 99) - (r1Rank.get(b) ?? 99))
    .map((teamId) => byId.get(teamId))
    .filter((entry): entry is PointsTableEntry => Boolean(entry));

  const top6 = r1Table.slice(0, 6);
  const used = new Set([
    ...top6.map((entry) => entry.teamId),
    seventhId,
    eighthId,
    ...r2Losers.map((entry) => entry.teamId),
  ]);
  const rest = r1Table.filter((entry) => !used.has(entry.teamId));

  return [...top6, seventh, eighth, ...r2Losers, ...rest].map((entry, index) => ({
    ...entry,
    rank: index + 1,
  }));
}

/** League table: Round 1 stats + Round 2 placement for ranks 7–8 when R2 is complete. */
export function buildFairPointsTableFromScores(
  teams: Team[],
  fixtures: Fixture[],
  scores: Record<string, StoredMatchScore>
): PointsTableEntry[] {
  const r1Fixtures = fixtures.filter((fixture) => fixture.stage === "round_1");
  const r1Scores = scoresForFixtures(scores, r1Fixtures);
  const r1Table = buildPointsTableFromScores(teams, r1Fixtures, r1Scores);

  const r2Fixtures = fixtures.filter((fixture) => fixture.stage === "integration");
  const r2Scores = scoresForFixtures(scores, r2Fixtures);
  const r2Matches = buildMatchesFromScores(r2Fixtures, r2Scores);
  const r2Complete =
    r2Fixtures.length > 0 &&
    r2Fixtures.every((fixture) => Boolean(r2Scores[fixture.id]?.winnerId));

  if (!r2Complete) {
    return r1Table;
  }

  return applyRound2QualificationPlacement(r1Table, r2Matches);
}

export function buildRound1PointsTableFromScores(
  teams: Team[],
  fixtures: Fixture[],
  scores: Record<string, StoredMatchScore>
): PointsTableEntry[] {
  const r1Fixtures = fixtures.filter((fixture) => fixture.stage === "round_1");
  return buildPointsTableFromScores(teams, r1Fixtures, scoresForFixtures(scores, r1Fixtures));
}

/** Re-rank entries that may have stale rank fields. */
export function finalizeRankedTable(entries: PointsTableEntry[]): PointsTableEntry[] {
  return rankTeams(entries.map((entry) => ({ ...entry, rank: 0 })));
}
