import { DAY1_MATCH_RESULTS_CSV } from "@/data/day1-2026-07-27-match-results";
import { buildSeedData } from "@/lib/seed";
import type { StoredMatchScore } from "@/types/scores";
import { buildStoredScore, parseScoreCsv, saveStoredScores } from "@/lib/scores/store";

let day1Cache: Record<string, StoredMatchScore> | null = null;

/** Official Day 1 (2026-07-27) Round 1 results from src/data/day1-2026-07-27-match-results.csv */
export function getOfficialDay1Scores(): Record<string, StoredMatchScore> {
  if (day1Cache) return day1Cache;

  const seed = buildSeedData();
  const rows = parseScoreCsv(DAY1_MATCH_RESULTS_CSV, seed.fixtures);
  const scores: Record<string, StoredMatchScore> = {};

  for (const row of rows) {
    if (row.errors.length) continue;
    const fixture = seed.fixtures.find(
      (f) => f.matchId.toUpperCase() === row.matchId.toUpperCase()
    );
    if (!fixture) continue;
    scores[fixture.id] = buildStoredScore(fixture, row, seed.teams, "csv");
  }

  day1Cache = scores;
  return scores;
}

export function mergeWithOfficialScores(
  stored: Record<string, StoredMatchScore>
): Record<string, StoredMatchScore> {
  return { ...getOfficialDay1Scores(), ...stored };
}

export function saveUserScoresOnly(all: Record<string, StoredMatchScore>): void {
  if (typeof window === "undefined") return;
  const official = getOfficialDay1Scores();
  const userOnly: Record<string, StoredMatchScore> = {};
  for (const [id, score] of Object.entries(all)) {
    const base = official[id];
    if (!base || JSON.stringify(base) !== JSON.stringify(score)) {
      userOnly[id] = score;
    }
  }
  saveStoredScores(userOnly);
}
