import { describe, expect, it } from "vitest";
import type { Ball, Innings, Match } from "@/types";
import {
  buildInningsAnalytics,
  buildMatchAnalytics,
  formatDismissalText,
  stageLabel,
  tossSummary,
} from "@/lib/match/scorecard-analytics";

const baseMatch: Match = {
  id: "m1",
  fixtureId: "f1",
  matchId: "QF2",
  stage: "quarter_final",
  status: "live",
  date: "2026-07-29",
  startTime: "18:00",
  ground: "Ground A",
  overs: 8,
  teamAId: "t1",
  teamBId: "t2",
  teamAName: "Team A",
  teamBName: "Team B",
  playingXiA: ["p1", "p2", "p3"],
  playingXiB: ["p4", "p5"],
  teamAMeta: { captainId: "p1", wicketKeeperId: "p2" },
  locked: false,
  published: false,
  shareSlug: "f1",
  createdAt: "",
  updatedAt: "",
};

const baseInnings: Innings = {
  id: "inn1",
  matchId: "m1",
  teamId: "t1",
  teamName: "Team A",
  inningsNumber: 1,
  runs: 0,
  wickets: 0,
  overs: 0,
  balls: 0,
  extras: { total: 0, wides: 0, noBalls: 0, byes: 0, legByes: 0, penalty: 0 },
  runRate: 0,
  partnership: {
    runs: 0,
    balls: 0,
    batsman1Id: "p1",
    batsman2Id: "p2",
    batsman1Runs: 0,
    batsman2Runs: 0,
  },
  completed: false,
  strikerId: "p1",
  nonStrikerId: "p2",
  bowlerId: "p4",
  createdAt: "",
  updatedAt: "",
};

function ball(partial: Partial<Ball> & Pick<Ball, "sequence">): Ball {
  return {
    id: `b${partial.sequence}`,
    matchId: "m1",
    inningsId: "inn1",
    overNumber: 0,
    ballNumber: partial.sequence,
    bowlerId: "p4",
    bowlerName: "Bowler",
    strikerId: "p1",
    strikerName: "Striker",
    nonStrikerId: "p2",
    nonStrikerName: "Non Striker",
    runs: 1,
    batsmanRuns: 1,
    extra: null,
    isWicket: false,
    commentary: "Single",
    timestamp: new Date(Date.UTC(2026, 6, 29, 12, 30, partial.sequence)).toISOString(),
    isLegalDelivery: true,
    ...partial,
  };
}

describe("scorecard analytics", () => {
  it("formats stage and toss labels", () => {
    expect(stageLabel("quarter_final")).toBe("Quarter Final");
    expect(
      tossSummary({ ...baseMatch, tossWinnerId: "t1", tossDecision: "bat" })
    ).toContain("Team A");
  });

  it("builds batting and bowling rows from balls", () => {
    const balls = [
      ball({ sequence: 1, runs: 4, batsmanRuns: 4, overNumber: 0, ballNumber: 1 }),
      ball({ sequence: 2, runs: 6, batsmanRuns: 6, overNumber: 0, ballNumber: 2 }),
      ball({
        sequence: 3,
        runs: 0,
        batsmanRuns: 0,
        isWicket: true,
        dismissal: "bowled",
        dismissedPlayerId: "p1",
        overNumber: 0,
        ballNumber: 3,
      }),
    ];

    const analytics = buildInningsAnalytics(
      balls,
      { ...baseInnings, runs: 10, wickets: 1 },
      baseMatch
    );

    expect(analytics.hasBallByBall).toBe(true);
    expect(analytics.batters.find((b) => b.playerId === "p1")?.runs).toBe(10);
    expect(analytics.batters.find((b) => b.playerId === "p1")?.isCaptain).toBe(true);
    expect(analytics.batters.find((b) => b.playerId === "p3")?.status).toBe("did_not_bat");
    expect(analytics.fallOfWickets).toHaveLength(1);
    expect(analytics.overs).toHaveLength(1);
    expect(analytics.runDistribution.fours).toBe(1);
    expect(analytics.runDistribution.sixes).toBe(1);
  });

  it("formats dismissal text", () => {
    expect(
      formatDismissalText(
        ball({ sequence: 1, isWicket: true, dismissal: "lbw", overNumber: 1, ballNumber: 4 })
      )
    ).toContain("lbw");
  });

  it("builds match-level analytics", () => {
    const balls = [
      ball({ sequence: 1, runs: 6, batsmanRuns: 6 }),
      ball({ sequence: 2, runs: 4, batsmanRuns: 4 }),
    ];
    const stats = buildMatchAnalytics(balls, [baseInnings], baseMatch);
    expect(stats.bestBatter?.runs).toBeGreaterThan(0);
    expect(stats.mostSixes?.count).toBe(1);
  });
});
