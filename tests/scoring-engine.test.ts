import { describe, expect, it } from "vitest";
import { scoreBall } from "@/lib/engine/scoring";
import { createInitialInnings } from "@/lib/engine/live-scoring-service";
import type { Match } from "@/types";

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

describe("createInitialInnings", () => {
  it("uses match.battingTeamId for second innings after swap", () => {
    const swapped: Match = {
      ...baseMatch,
      target: 121,
      battingTeamId: "b",
      bowlingTeamId: "a",
    };
    const inn = createInitialInnings(swapped, 2);
    expect(inn.teamId).toBe("b");
    expect(inn.inningsNumber).toBe(2);
  });
});

describe("scoreBall", () => {
  it("increments runs on a single", () => {
    const innings = createInitialInnings(baseMatch, 1);
    const result = scoreBall({
      match: baseMatch,
      innings,
      strikerId: innings.strikerId!,
      strikerName: "A1",
      nonStrikerId: innings.nonStrikerId!,
      nonStrikerName: "A2",
      bowlerId: innings.bowlerId!,
      bowlerName: "B1",
      action: { type: "runs", runs: 1 },
      sequence: 0,
    });
    expect(result.ball.runs).toBe(1);
    expect(result.updatedInnings.runs).toBe(1);
    expect(result.rotateStrike).toBe(true);
  });

  it("records a dot without adding runs", () => {
    const innings = createInitialInnings(baseMatch, 1);
    const result = scoreBall({
      match: baseMatch,
      innings,
      strikerId: innings.strikerId!,
      strikerName: "A1",
      nonStrikerId: innings.nonStrikerId!,
      nonStrikerName: "A2",
      bowlerId: innings.bowlerId!,
      bowlerName: "B1",
      action: { type: "dot" },
      sequence: 0,
    });
    expect(result.updatedInnings.runs).toBe(0);
    expect(result.ball.isLegalDelivery).toBe(true);
  });
});
