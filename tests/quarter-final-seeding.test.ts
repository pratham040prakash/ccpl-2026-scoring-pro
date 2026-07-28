import { describe, expect, it } from "vitest";
import { buildSeedData } from "@/lib/seed";
import {
  applyQuarterFinalSeeding,
  getQualifiedTeams,
  QUALIFYING_TEAM_COUNT,
} from "@/lib/engine/tournament";
import { resolveFixturesWithScores } from "@/lib/scores/fixture-resolution";
import { buildFairPointsTableFromScores } from "@/lib/scores/fair-standings";
import { getAllOfficialScores } from "@/lib/scores/official-results";
import { canStartLiveScoring } from "@/lib/live/match-start";

describe("quarter-final seeding", () => {
  it("qualifies top 8 teams from the fair points table", () => {
    const { teams, fixtures } = buildSeedData();
    const scores = getAllOfficialScores();
    const table = buildFairPointsTableFromScores(teams, fixtures, scores);
    const qualified = getQualifiedTeams(table);

    expect(qualified).toHaveLength(QUALIFYING_TEAM_COUNT);
    expect(qualified[0]?.teamName).toBe("Aura Strikers");
    expect(qualified[6]?.teamName).toBe("Play Bold XI");
    expect(qualified[7]?.teamName).toBe("11 Daulath's");
  });

  it("seeds QF1–QF4 as 1v8, 2v7, 3v6, 4v5 on the fair table", () => {
    const { teams, fixtures } = buildSeedData();
    const scores = getAllOfficialScores();
    const table = buildFairPointsTableFromScores(teams, fixtures, scores);
    const resolved = applyQuarterFinalSeeding(fixtures, table, teams);

    const qf1 = resolved.find((fixture) => fixture.matchId === "QF1");
    const qf4 = resolved.find((fixture) => fixture.matchId === "QF4");

    expect(qf1?.teamAName).toBe("Aura Strikers");
    expect(qf1?.teamBName).toBe("11 Daulath's");
    expect(qf4?.teamAName).toBe("Bengaluru Blasters");
    expect(qf4?.teamBName).toBe("The Cluster XI");
    expect(canStartLiveScoring(qf1!)).toEqual({ ok: true });
  });

  it("resolves quarter-finals when building fixtures from scores", () => {
    const { fixtures } = buildSeedData();
    const resolved = resolveFixturesWithScores(fixtures, getAllOfficialScores());
    const quarterFinals = resolved.filter((fixture) => fixture.stage === "quarter_final");

    expect(quarterFinals).toHaveLength(4);
    expect(quarterFinals.every((fixture) => fixture.teamAId && fixture.teamBId)).toBe(true);
    expect(quarterFinals.every((fixture) => !fixture.teamAName.startsWith("Seed"))).toBe(true);
  });
});
