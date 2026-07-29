import { describe, expect, it } from "vitest";
import { buildSeedData } from "@/lib/seed";
import { getAllOfficialScores } from "@/lib/scores/official-results";
import {
  buildInningsFromStoredScore,
  buildMatchFromStoredScore,
  formatInningsScore,
  resolveScorecardMode,
} from "@/lib/match/match-scorecard";

describe("match scorecard", () => {
  it("builds synthetic innings from stored CSV score", () => {
    const { fixtures } = buildSeedData();
    const qf2 = fixtures.find((f) => f.matchId === "QF2")!;
    const score = getAllOfficialScores().qf2;

    const innings = buildInningsFromStoredScore(qf2, score);
    expect(innings).toHaveLength(2);
    expect(formatInningsScore(innings[0])).toContain("54-6");
    expect(formatInningsScore(innings[1])).toContain("54-5");
  });

  it("builds completed match result from stored score", () => {
    const { fixtures } = buildSeedData();
    const qf2 = fixtures.find((f) => f.matchId === "QF2")!;
    const score = getAllOfficialScores().qf2;
    const match = buildMatchFromStoredScore(qf2, score);

    expect(match.result?.winnerName).toBe("Play Bold XI");
    expect(match.result?.margin).toBe("Super Over");
  });

  it("resolves summary mode for CSV completed matches", () => {
    expect(
      resolveScorecardMode({
        fixtureStatus: "completed",
        storedScore: getAllOfficialScores().qf2,
        firestoreInningsCount: 0,
        hasBallByBall: false,
      })
    ).toBe("summary");
  });

  it("resolves full mode when ball-by-ball exists", () => {
    expect(
      resolveScorecardMode({
        fixtureStatus: "completed",
        storedScore: null,
        firestoreInningsCount: 2,
        hasBallByBall: true,
      })
    ).toBe("full");
  });
});
