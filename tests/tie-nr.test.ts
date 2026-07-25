import { describe, expect, it } from "vitest";
import { computeMatchResult } from "@/lib/engine/match-finalization";
import { calculatePointsTable } from "@/lib/engine/tournament";
import type { Innings, Match } from "@/types";

const baseMatch: Match = {
  id: "m1",
  fixtureId: "f1",
  matchId: "R1-1",
  stage: "round_1",
  status: "completed",
  date: "2026-07-27",
  startTime: "09:00",
  ground: "G",
  overs: 6,
  teamAId: "a",
  teamBId: "b",
  teamAName: "Team A",
  teamBName: "Team B",
  battingTeamId: "a",
  bowlingTeamId: "b",
  playingXiA: [],
  playingXiB: [],
  locked: true,
  published: true,
  shareSlug: "f1",
  target: 81,
  createdAt: "",
  updatedAt: "",
};

function inn(teamId: string, n: 1 | 2, runs: number): Innings {
  return {
    id: `i${n}`,
    matchId: "m1",
    teamId,
    teamName: teamId,
    inningsNumber: n,
    runs,
    wickets: 5,
    overs: 6,
    balls: 0,
    extras: { total: 0, wides: 0, noBalls: 0, byes: 0, legByes: 0, penalty: 0 },
    runRate: runs / 6,
    partnership: {
      runs: 0,
      balls: 0,
      batsman1Id: "p1",
      batsman2Id: "p2",
      batsman1Runs: 0,
      batsman2Runs: 0,
    },
    completed: true,
    createdAt: "",
    updatedAt: "",
  };
}

describe("tie and NR finalization", () => {
  it("reports a tie without picking arbitrary winner", () => {
    const { result, winnerId } = computeMatchResult(baseMatch, [
      inn("a", 1, 80),
      inn("b", 2, 80),
    ]);
    expect(winnerId).toBeNull();
    expect(result.isTie).toBe(true);
    expect(result.summary).toContain("tied");
  });

  it("awards tie points to both teams", () => {
    const inningsList = [inn("a", 1, 80), inn("b", 2, 80)];
    const { result } = computeMatchResult(baseMatch, inningsList);
    const table = calculatePointsTable(
      [
        { id: "a", name: "A", shortName: "A", playerIds: [], stats: empty(), createdAt: "", updatedAt: "" },
        { id: "b", name: "B", shortName: "B", playerIds: [], stats: empty(), createdAt: "", updatedAt: "" },
      ],
      [{ ...baseMatch, result }],
      { m1: inningsList },
      { pointsWin: 2, pointsTie: 1, pointsNr: 1 }
    );
    const a = table.find((t) => t.teamId === "a")!;
    const b = table.find((t) => t.teamId === "b")!;
    expect(a.tied).toBe(1);
    expect(b.tied).toBe(1);
    expect(a.points).toBe(1);
    expect(b.points).toBe(1);
  });
});

function empty() {
  return {
    played: 0,
    won: 0,
    lost: 0,
    tied: 0,
    nr: 0,
    points: 0,
    runsFor: 0,
    runsAgainst: 0,
    oversFor: 0,
    oversAgainst: 0,
    nrr: 0,
    runRate: 0,
  };
}
