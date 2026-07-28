import { describe, expect, it } from "vitest";
import { mergeScoreLayers } from "@/lib/scores/firestore-scores";
import type { StoredMatchScore } from "@/types/scores";

function score(updatedAt: string, winnerId = "a"): StoredMatchScore {
  return {
    fixtureId: "f1",
    matchId: "R1-1",
    teamAId: "a",
    teamBId: "b",
    teamAName: "A",
    teamBName: "B",
    teamARuns: 100,
    teamAWickets: 5,
    teamAOvers: 20,
    teamABalls: 0,
    teamBRuns: 90,
    teamBWickets: 8,
    teamBOvers: 20,
    teamBBalls: 0,
    winnerName: "A",
    winnerId,
    margin: "10 runs",
    marginType: "runs",
    status: "published",
    source: "live",
    updatedAt,
  };
}

describe("mergeScoreLayers", () => {
  it("prefers the newer score for the same fixture", () => {
    const local = { f1: score("2026-07-27T10:00:00.000Z", "a") };
    const remote = { f1: score("2026-07-27T12:00:00.000Z", "b") };
    const merged = mergeScoreLayers(local, remote);
    expect(merged.f1.winnerId).toBe("b");
  });

  it("keeps local-only scores and adds remote-only scores", () => {
    const local = { f1: score("2026-07-27T10:00:00.000Z") };
    const remote = { f2: score("2026-07-27T11:00:00.000Z") };
    const merged = mergeScoreLayers(local, remote);
    expect(merged.f1).toBeDefined();
    expect(merged.f2).toBeDefined();
  });
});
