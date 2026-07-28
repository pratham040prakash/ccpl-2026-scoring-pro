import { describe, expect, it } from "vitest";
import { buildSeedData } from "@/lib/seed";
import {
  applyQuarterFinalSeeding,
  getQualifiedTeams,
  QUALIFYING_TEAM_COUNT,
} from "@/lib/engine/tournament";
import { resolveFixturesWithScores } from "@/lib/scores/fixture-resolution";
import { getOfficialDay1Scores } from "@/lib/scores/official-results";
import { buildPointsTableFromScores } from "@/lib/scores/store";
import { canStartLiveScoring } from "@/lib/live/match-start";

describe("quarter-final seeding", () => {
  it("qualifies top 8 teams from the points table", () => {
    const { teams, fixtures } = buildSeedData();
    const scores = getOfficialDay1Scores();
    const table = buildPointsTableFromScores(teams, fixtures, scores);
    const qualified = getQualifiedTeams(table);

    expect(qualified).toHaveLength(QUALIFYING_TEAM_COUNT);
    expect(qualified[0]?.rank).toBe(1);
    expect(qualified[7]?.rank).toBe(8);
  });

  it("seeds QF1–QF4 as 1v8, 2v7, 3v6, 4v5", () => {
    const { teams, fixtures } = buildSeedData();
    const scores = getOfficialDay1Scores();
    const table = buildPointsTableFromScores(teams, fixtures, scores);
    const resolved = applyQuarterFinalSeeding(fixtures, table, teams);

    const qf1 = resolved.find((fixture) => fixture.matchId === "QF1");
    const qf4 = resolved.find((fixture) => fixture.matchId === "QF4");

    expect(qf1?.teamAName).toBe(table.find((entry) => entry.rank === 1)?.teamName);
    expect(qf1?.teamBName).toBe(table.find((entry) => entry.rank === 8)?.teamName);
    expect(qf4?.teamAName).toBe(table.find((entry) => entry.rank === 4)?.teamName);
    expect(qf4?.teamBName).toBe(table.find((entry) => entry.rank === 5)?.teamName);
    expect(canStartLiveScoring(qf1!)).toEqual({ ok: true });
  });

  it("resolves quarter-finals when building fixtures from scores", () => {
    const { fixtures } = buildSeedData();
    const resolved = resolveFixturesWithScores(fixtures, getOfficialDay1Scores());
    const quarterFinals = resolved.filter((fixture) => fixture.stage === "quarter_final");

    expect(quarterFinals).toHaveLength(4);
    expect(quarterFinals.every((fixture) => fixture.teamAId && fixture.teamBId)).toBe(true);
    expect(quarterFinals.every((fixture) => !fixture.teamAName.startsWith("Seed"))).toBe(true);
  });
});
