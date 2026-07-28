import { describe, expect, it } from "vitest";
import { buildSeedData } from "@/lib/seed";
import { applyConfirmedRound2Fixtures, ROUND_2_CONFIRMED } from "@/data/round2-assignments";
import { resolveFixturesWithScores } from "@/lib/scores/fixture-resolution";
import { getOfficialDay1Scores } from "@/lib/scores/official-results";
import { canStartLiveScoring } from "@/lib/live/match-start";

describe("Round 2 assignments", () => {
  it("sets confirmed Round 2 pairings", () => {
    const { fixtures } = buildSeedData();
    const resolved = applyConfirmedRound2Fixtures(fixtures);

    const r2_1 = resolved.find((fixture) => fixture.matchId === "R2-1");
    const r2_2 = resolved.find((fixture) => fixture.matchId === "R2-2");

    expect(r2_1?.teamAName).toBe("Data Warriors");
    expect(r2_1?.teamBName).toBe("11 Daulath's");
    expect(r2_2?.teamAName).toBe("Play Bold XI");
    expect(r2_2?.teamBName).toBe("Lifecycle Cricket Team");
    expect(canStartLiveScoring(r2_1!)).toEqual({ ok: true });
    expect(canStartLiveScoring(r2_2!)).toEqual({ ok: true });
  });

  it("keeps Round 2 assignments when resolving from scores", () => {
    const { fixtures } = buildSeedData();
    const resolved = resolveFixturesWithScores(fixtures, getOfficialDay1Scores());

    expect(resolved.find((f) => f.matchId === "R2-1")).toMatchObject({
      teamAId: ROUND_2_CONFIRMED["r2-1"].teamAId,
      teamBId: ROUND_2_CONFIRMED["r2-1"].teamBId,
    });
    expect(resolved.find((f) => f.matchId === "R2-2")).toMatchObject({
      teamAId: ROUND_2_CONFIRMED["r2-2"].teamAId,
      teamBId: ROUND_2_CONFIRMED["r2-2"].teamBId,
    });
  });
});
