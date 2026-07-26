import { describe, expect, it } from "vitest";
import {
  ballCompletedOver,
  getNextSuggestedBatter,
  suggestBowler,
  validateBatterPick,
  validateBowlerPick,
} from "@/lib/live/participant-selection";
import type { RosterPlayer } from "@/lib/live/player-roster";
import type { Ball } from "@/types";

const xi: RosterPlayer[] = [
  { id: "p1", name: "Opener One" },
  { id: "p2", name: "Opener Two" },
  { id: "p3", name: "Middle" },
];

describe("participant-selection", () => {
  it("suggests next batter by order", () => {
    const next = getNextSuggestedBatter(xi, ["p1", "p2", "p3"], {
      outIds: new Set(["p1"]),
      strikerId: "p2",
      nonStrikerId: "p2",
    });
    expect(next?.id).toBe("p3");
  });

  it("blocks duplicate crease picks", () => {
    expect(
      validateBatterPick("p2", "striker", {
        outIds: new Set(),
        strikerId: "p1",
        nonStrikerId: "p2",
      })
    ).toContain("Non-striker");
  });

  it("blocks same bowler consecutive over", () => {
    expect(
      validateBowlerPick("b1", "b1", [], 6)
    ).toContain("consecutive");
  });

  it("detects completed over on 6th legal ball", () => {
    const ball = {
      isLegalDelivery: true,
      ballNumber: 6,
    } as Ball;
    expect(ballCompletedOver(ball)).toBe(true);
  });

  it("suggests previous over partner as bowler", () => {
    const bowlingXi = [
      { id: "b1", name: "B1" },
      { id: "b2", name: "B2" },
      { id: "b3", name: "B3" },
    ];
    const balls = [
      { overNumber: 0, bowlerId: "b2" },
      { overNumber: 1, bowlerId: "b1" },
    ] as Ball[];
    const suggestion = suggestBowler(bowlingXi, [], balls, "b1", 6);
    expect(suggestion?.playerId).toBe("b2");
    expect(suggestion?.reason).toBe("previous_partner");
  });
});
