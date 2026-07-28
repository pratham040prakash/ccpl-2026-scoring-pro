import { describe, expect, it } from "vitest";
import { buildSeedData } from "@/lib/seed";
import {
  applyRound2QualificationPlacement,
  buildFairPointsTableFromScores,
  buildRound1PointsTableFromScores,
} from "@/lib/scores/fair-standings";
import { getAllOfficialScores } from "@/lib/scores/official-results";
import { buildMatchesFromScores } from "@/lib/scores/matches-from-scores";
import { applyConfirmedQuarterFinalFixtures } from "@/data/quarter-final-assignments";
import { resolveFixturesWithScores } from "@/lib/scores/fixture-resolution";

describe("fair standings", () => {
  it("does not double-count Round 2 wins as league points", () => {
    const { teams, fixtures } = buildSeedData();
    const scores = getAllOfficialScores();
    const table = buildFairPointsTableFromScores(teams, fixtures, scores);
    const playBold = table.find((entry) => entry.teamId === "play-bold-xi");
    expect(playBold?.points).toBe(2);
    expect(playBold?.played).toBe(1);
    expect(playBold?.rank).toBe(7);
  });

  it("promotes R2 winners to 7th and 8th for QF", () => {
    const { teams, fixtures } = buildSeedData();
    const scores = getAllOfficialScores();
    const table = buildFairPointsTableFromScores(teams, fixtures, scores);
    expect(table[6]?.teamName).toBe("Play Bold XI");
    expect(table[7]?.teamName).toBe("11 Daulath's");
    expect(table[8]?.teamName).toBe("Data Warriors");
    expect(table[9]?.teamName).toBe("Lifecycle Cricket Team");
  });

  it("seeds quarter-finals for Wed 29 from fair top 8", () => {
    const { fixtures } = buildSeedData();
    const resolved = applyConfirmedQuarterFinalFixtures(
      resolveFixturesWithScores(fixtures, getAllOfficialScores())
    );
    const qf1 = resolved.find((fixture) => fixture.matchId === "QF1");
    const qf2 = resolved.find((fixture) => fixture.matchId === "QF2");
    expect(qf1?.teamAName).toBe("Aura Strikers");
    expect(qf1?.teamBName).toBe("11 Daulath's");
    expect(qf2?.teamAName).toBe("Slog Squad");
    expect(qf2?.teamBName).toBe("Play Bold XI");
  });

  it("applyRound2QualificationPlacement orders R2 losers by R1 rank", () => {
    const { teams, fixtures } = buildSeedData();
    const scores = getAllOfficialScores();
    const r1Table = buildRound1PointsTableFromScores(teams, fixtures, scores);
    const r2Fixtures = fixtures.filter((fixture) => fixture.stage === "integration");
    const r2Matches = buildMatchesFromScores(r2Fixtures, scores);
    const fair = applyRound2QualificationPlacement(r1Table, r2Matches);
    expect(fair[8]?.teamId).toBe("data-warriors");
    expect(fair[9]?.teamId).toBe("lifecycle-cricket-team");
  });
});
