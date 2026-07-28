import type { Fixture, Match, Team } from "@/types";
import type { StoredMatchScore } from "@/types/scores";
import { applyConfirmedRound2Fixtures } from "@/data/round2-assignments";
import { applyConfirmedQuarterFinalFixtures } from "@/data/quarter-final-assignments";
import {
  applyQuarterFinalSeeding,
  resolveKnockoutTeams,
} from "@/lib/engine/tournament";
import { buildSeedData } from "@/lib/seed";
import { buildFairPointsTableFromScores } from "@/lib/scores/fair-standings";
import { buildMatchesFromScores } from "@/lib/scores/matches-from-scores";
import { mergeFixturesWithScores } from "@/lib/scores/store";

export { buildMatchesFromScores } from "@/lib/scores/matches-from-scores";

export function resolveFixturesWithScores(
  baseFixtures: Fixture[],
  scores: Record<string, StoredMatchScore>,
  teams: Team[] = buildSeedData().teams
): Fixture[] {
  const withResults = mergeFixturesWithScores(baseFixtures, scores);
  const table = buildFairPointsTableFromScores(teams, withResults, scores);
  const matches = buildMatchesFromScores(withResults, scores);
  const resolved = resolveKnockoutTeams(withResults, matches, table, teams);
  const withRound2 = applyConfirmedRound2Fixtures(resolved);
  const withQuarterFinals = applyQuarterFinalSeeding(withRound2, table, teams);
  return applyConfirmedQuarterFinalFixtures(withQuarterFinals);
}
