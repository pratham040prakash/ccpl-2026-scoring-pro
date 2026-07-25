import { describe, expect, it } from "vitest";
import { scoreBall } from "@/lib/engine/scoring";
import { createInitialInnings } from "@/lib/engine/live-scoring-service";
import { sanitizeForFirestore } from "@/lib/firebase/sanitize";
import type { Match } from "@/types";

const baseMatch: Match = {
  id: "m1",
  fixtureId: "f1",
  matchId: "R1-1",
  stage: "round_1",
  status: "live",
  date: "2026-07-27",
  startTime: "10:00",
  ground: "Ground",
  overs: 6,
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

describe("sanitizeForFirestore", () => {
  it("removes undefined optional ball fields", () => {
    const innings = createInitialInnings(baseMatch, 1);
    const { ball } = scoreBall({
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

    const sanitized = sanitizeForFirestore(ball) as Record<string, unknown>;
    expect("dismissal" in sanitized).toBe(false);
    expect("dismissedPlayerId" in sanitized).toBe(false);
    expect("fielderId" in sanitized).toBe(false);
  });

  it("keeps wicket dismissal fields", () => {
    const innings = createInitialInnings(baseMatch, 1);
    const { ball } = scoreBall({
      match: baseMatch,
      innings,
      strikerId: "striker-1",
      strikerName: "A1",
      nonStrikerId: "non-striker-1",
      nonStrikerName: "A2",
      bowlerId: "bowler-1",
      bowlerName: "B1",
      action: { type: "wicket", dismissal: "bowled" },
      sequence: 0,
    });

    const sanitized = sanitizeForFirestore(ball) as Record<string, unknown>;
    expect(sanitized.dismissal).toBe("bowled");
    expect(sanitized.dismissedPlayerId).toBe("striker-1");
  });
});
