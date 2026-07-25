import { describe, expect, it } from "vitest";
import { canManualFinalizeMatch } from "@/lib/engine/live-scoring-service";
import type { Innings, Match } from "@/types";

const baseMatch: Match = {
  id: "m1",
  fixtureId: "f1",
  matchId: "R1-1",
  stage: "round_1",
  status: "live",
  date: "2026-07-25",
  startTime: "10:00",
  ground: "Ground",
  overs: 20,
  teamAId: "a",
  teamBId: "b",
  teamAName: "Team A",
  teamBName: "Team B",
  battingTeamId: "a",
  bowlingTeamId: "b",
  playingXiA: [],
  playingXiB: [],
  locked: false,
  published: true,
  shareSlug: "f1",
  createdAt: "",
  updatedAt: "",
};

function innings(n: 1 | 2, overrides: Partial<Innings> = {}): Innings {
  return {
    id: `inn${n}`,
    matchId: "m1",
    inningsNumber: n,
    teamId: n === 1 ? "a" : "b",
    runs: n === 1 ? 120 : 121,
    wickets: 5,
    overs: 20,
    balls: 0,
    extras: { total: 0, wides: 0, noBalls: 0, byes: 0, legByes: 0, penalty: 0 },
    strikerId: "p1",
    nonStrikerId: "p2",
    bowlerId: "p3",
    completed: n === 1,
    nextSequence: 0,
    partnership: {
      runs: 0,
      balls: 0,
      batsman1Id: "p1",
      batsman2Id: "p2",
      batsman1Runs: 0,
      batsman2Runs: 0,
    },
    createdAt: "",
    updatedAt: "",
    ...overrides,
  };
}

describe("canManualFinalizeMatch", () => {
  it("allows finalize when chase target is reached", () => {
    const match = { ...baseMatch, target: 121 };
    const gate = canManualFinalizeMatch(match, [innings(1), innings(2)]);
    expect(gate.ok).toBe(true);
  });

  it("blocks finalize when only first innings exists", () => {
    const gate = canManualFinalizeMatch(baseMatch, [innings(1)]);
    expect(gate.ok).toBe(false);
    expect(gate.reason).toMatch(/Both innings/i);
  });

  it("blocks finalize when chase is incomplete", () => {
    const match = { ...baseMatch, target: 200 };
    const gate = canManualFinalizeMatch(match, [
      innings(1),
      innings(2, { runs: 50, completed: false, wickets: 3 }),
    ]);
    expect(gate.ok).toBe(false);
  });

  it("blocks finalize when result already saved", () => {
    const match = {
      ...baseMatch,
      target: 121,
      result: { summary: "Team B won", winnerTeamId: "b" },
    };
    const gate = canManualFinalizeMatch(match, [innings(1), innings(2)]);
    expect(gate.ok).toBe(false);
    expect(gate.reason).toMatch(/already finalized/i);
  });
});
