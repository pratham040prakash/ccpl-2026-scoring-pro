import { DAY1_MATCH_RESULTS_CSV } from "@/data/day1-2026-07-27-match-results";
import { FULL_MATCH_RESULTS_CSV } from "@/data/ccpl-2026-full-match-results";
import { applyConfirmedRound2Fixtures } from "@/data/round2-assignments";
import { buildSeedData } from "@/lib/seed";
import { buildFairPointsTableFromScores } from "@/lib/scores/fair-standings";
import type { PointsTableEntry } from "@/types";
import type { StoredMatchScore } from "@/types/scores";
import {
  buildPointsTableFromScores,
  buildStoredScore,
  parseScoreCsv,
  saveStoredScores,
} from "@/lib/scores/store";

let day1Cache: Record<string, StoredMatchScore> | null = null;
let allOfficialCache: Record<string, StoredMatchScore> | null = null;

function scoresFromCsv(csvText: string): Record<string, StoredMatchScore> {
  const seed = buildSeedData();
  const fixtures = applyConfirmedRound2Fixtures(seed.fixtures);
  const rows = parseScoreCsv(csvText, fixtures);
  const scores: Record<string, StoredMatchScore> = {};

  for (const row of rows) {
    if (row.errors.length) continue;
    const fixture = seed.fixtures.find(
      (f) => f.matchId.toUpperCase() === row.matchId.toUpperCase()
    );
    if (!fixture) continue;
    scores[fixture.id] = buildStoredScore(fixture, row, seed.teams, "csv");
  }

  return scores;
}

/** Official Day 1 (2026-07-27) Round 1 results only. */
export function getOfficialDay1Scores(): Record<string, StoredMatchScore> {
  if (day1Cache) return day1Cache;
  day1Cache = scoresFromCsv(DAY1_MATCH_RESULTS_CSV);
  return day1Cache;
}

/** All published R1 + R2 results bundled with the app. */
export function getAllOfficialScores(): Record<string, StoredMatchScore> {
  if (allOfficialCache) return allOfficialCache;
  allOfficialCache = scoresFromCsv(FULL_MATCH_RESULTS_CSV);
  return allOfficialCache;
}

export function mergeWithOfficialScores(
  stored: Record<string, StoredMatchScore>
): Record<string, StoredMatchScore> {
  return { ...getAllOfficialScores(), ...stored };
}

/** Round 1 only — used in legacy tests and Day 1 exports. */
export function getBundledOfficialPointsTable(): PointsTableEntry[] {
  const seed = buildSeedData();
  return buildPointsTableFromScores(seed.teams, seed.fixtures, getOfficialDay1Scores());
}

/** Fair league table (R1 stats + R2 placement for 7th/8th) bundled offline. */
export function getBundledFairPointsTable(): PointsTableEntry[] {
  const seed = buildSeedData();
  return buildFairPointsTableFromScores(seed.teams, seed.fixtures, getAllOfficialScores());
}

export function officialStandingsPlayedCount(table: PointsTableEntry[]): number {
  return table.reduce((sum, entry) => sum + entry.played, 0);
}

export function saveUserScoresOnly(all: Record<string, StoredMatchScore>): void {
  if (typeof window === "undefined") return;
  const official = getAllOfficialScores();
  const userOnly: Record<string, StoredMatchScore> = {};
  for (const [id, score] of Object.entries(all)) {
    const base = official[id];
    if (!base || JSON.stringify(base) !== JSON.stringify(score)) {
      userOnly[id] = score;
    }
  }
  saveStoredScores(userOnly);
}
