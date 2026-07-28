import type { Fixture, Match, Team } from "@/types";
import type { StoredMatchScore } from "@/types/scores";
import { applyConfirmedRound2Fixtures } from "@/data/round2-assignments";
import {
  applyQuarterFinalSeeding,
  resolveKnockoutTeams,
} from "@/lib/engine/tournament";
import { buildSeedData } from "@/lib/seed";
import { buildPointsTableFromScores, mergeFixturesWithScores } from "@/lib/scores/store";

export function buildMatchesFromScores(
  fixtures: Fixture[],
  scores: Record<string, StoredMatchScore>
): Match[] {
  const now = new Date().toISOString();
  const matches: Match[] = [];

  for (const fixture of fixtures) {
    const score = scores[fixture.id] ?? scores[fixture.matchId.toLowerCase()];
    if (!score?.winnerId) continue;

    matches.push({
      id: fixture.id,
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
      createdAt: score.updatedAt || now,
      updatedAt: score.updatedAt || now,
    });
  }

  return matches;
}

export function resolveFixturesWithScores(
  baseFixtures: Fixture[],
  scores: Record<string, StoredMatchScore>,
  teams: Team[] = buildSeedData().teams
): Fixture[] {
  const withResults = mergeFixturesWithScores(baseFixtures, scores);
  const table = buildPointsTableFromScores(teams, withResults, scores);
  const matches = buildMatchesFromScores(withResults, scores);
  const resolved = resolveKnockoutTeams(withResults, matches, table, teams);
  const withRound2 = applyConfirmedRound2Fixtures(resolved);
  return applyQuarterFinalSeeding(withRound2, table, teams);
}
