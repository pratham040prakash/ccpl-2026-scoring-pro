import { describe, expect, it } from "vitest";
import { buildSeedData } from "@/lib/seed";
import { getAllOfficialScores } from "@/lib/scores/official-results";
import { resolveFixturesWithScores } from "@/lib/scores/fixture-resolution";

describe("semi-final assignments", () => {
  it("sets SF2 to Play Bold XI vs Rising Stars", () => {
    const { fixtures } = buildSeedData();
    const resolved = resolveFixturesWithScores(fixtures, getAllOfficialScores());
    const sf2 = resolved.find((fixture) => fixture.matchId === "SF2");

    expect(sf2?.teamAName).toBe("Play Bold XI");
    expect(sf2?.teamBName).toBe("Rising Stars");
    expect(sf2?.teamAId).toBe("play-bold-xi");
    expect(sf2?.teamBId).toBe("rising-stars");
  });
});
