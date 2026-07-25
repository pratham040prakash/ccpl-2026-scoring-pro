import { describe, expect, it } from "vitest";
import { computePartnership } from "@/lib/engine/innings-metrics";
import type { Ball } from "@/types";

function ball(partial: Partial<Ball> & Pick<Ball, "sequence">): Ball {
  return {
    id: `b${partial.sequence}`,
    matchId: "m1",
    inningsId: "i1",
    overNumber: 0,
    ballNumber: partial.sequence + 1,
    bowlerId: "bowler",
    bowlerName: "Bowler",
    strikerId: "s1",
    strikerName: "Striker",
    nonStrikerId: "s2",
    nonStrikerName: "Non",
    runs: 0,
    batsmanRuns: 0,
    extra: null,
    isWicket: false,
    commentary: "",
    timestamp: new Date().toISOString(),
    isLegalDelivery: true,
    ...partial,
  };
}

describe("computePartnership", () => {
  it("excludes the wicket ball from the new partnership", () => {
    const balls = [
      ball({ sequence: 0, runs: 4, batsmanRuns: 4 }),
      ball({ sequence: 1, isWicket: true, dismissedPlayerId: "s1" }),
      ball({ sequence: 2, runs: 1, batsmanRuns: 1 }),
    ];
    const p = computePartnership(balls, "s3", "s2");
    expect(p.runs).toBe(1);
    expect(p.balls).toBe(1);
  });
});
