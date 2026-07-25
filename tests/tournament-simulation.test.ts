import { describe, expect, it } from "vitest";
import { buildSeedData } from "@/lib/seed";
import {
  calculatePointsTable,
  canProgressStage,
  deriveCurrentStage,
  findBestLosingTeam,
  resolveKnockoutTeams,
} from "@/lib/engine/tournament";
import { canStartLiveScoring } from "@/lib/live/match-start";
import type { Innings, Match, MatchResult } from "@/types";

function completedMatch(
  fixtureId: string,
  matchId: string,
  stage: Match["stage"],
  teamAId: string,
  teamBId: string,
  winnerId: string,
  teamARuns: number,
  teamBRuns: number
): { match: Match; innings: Innings[] } {
  const loserId = winnerId === teamAId ? teamBId : teamAId;
  const result: MatchResult = {
    winnerId,
    winnerName: winnerId,
    margin: "5 runs",
    marginType: "runs",
    summary: `${winnerId} won`,
  };
  const match: Match = {
    id: `match-${matchId}`,
    fixtureId,
    matchId,
    stage,
    status: "completed",
    date: "2026-07-27",
    startTime: "09:00",
    ground: "Ground 1",
    overs: 6,
    teamAId,
    teamBId,
    teamAName: teamAId,
    teamBName: teamBId,
    playingXiA: [],
    playingXiB: [],
    locked: true,
    published: true,
    shareSlug: fixtureId,
    result,
    createdAt: "",
    updatedAt: "",
  };

  const innA: Innings = {
    id: `${match.id}-1`,
    matchId: match.id,
    teamId: teamAId,
    teamName: teamAId,
    inningsNumber: 1,
    runs: teamARuns,
    wickets: 3,
    overs: 6,
    balls: 0,
    extras: { total: 0, wides: 0, noBalls: 0, byes: 0, legByes: 0, penalty: 0 },
    runRate: teamARuns / 6,
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

  const innB: Innings = {
    ...innA,
    id: `${match.id}-2`,
    teamId: teamBId,
    teamName: teamBId,
    inningsNumber: 2,
    runs: teamBRuns,
    wickets: winnerId === teamBId ? 3 : 10,
  };

  void loserId;
  return { match, innings: [innA, innB] };
}

describe("full tournament simulation (in-memory)", () => {
  it("progresses from Round 1 through Final with resolved knockout teams", () => {
    const seed = buildSeedData();
    const { fixtures, teams } = seed;

    const r1Fixtures = fixtures.filter((f) => f.stage === "round_1");
    expect(r1Fixtures).toHaveLength(9);

    const matches: Match[] = [];
    const inningsMap: Record<string, Innings[]> = {};

    for (let i = 0; i < r1Fixtures.length; i++) {
      const f = r1Fixtures[i];
      const winner = i % 2 === 0 ? f.teamAId : f.teamBId;
      const { match, innings } = completedMatch(
        f.id,
        f.matchId,
        "round_1",
        f.teamAId,
        f.teamBId,
        winner,
        80 + i,
        70 + i
      );
      matches.push(match);
      inningsMap[match.id] = innings;
    }

    const table = calculatePointsTable(teams, matches, inningsMap, {
      pointsWin: 2,
      pointsTie: 1,
      pointsNr: 1,
    });
    expect(table.filter((e) => e.played > 0).length).toBeGreaterThan(0);

    const bestLoser = findBestLosingTeam(fixtures, matches, table);
    expect(bestLoser).toBeTruthy();

    let resolved = resolveKnockoutTeams(fixtures, matches, table, teams);
    const r2_1 = resolved.find((f) => f.matchId === "R2-1");
    expect(r2_1?.teamAId).toBeTruthy();
    expect(r2_1?.teamBId).toBe(bestLoser);
    expect(canStartLiveScoring(r2_1!)).toEqual({ ok: true });

    for (const fixture of resolved.filter((f) => f.stage === "integration")) {
      if (!fixture.teamAId || !fixture.teamBId) continue;
      const winner = fixture.teamAId;
      const { match, innings } = completedMatch(
        fixture.id,
        fixture.matchId,
        fixture.stage,
        fixture.teamAId,
        fixture.teamBId,
        winner,
        90,
        85
      );
      matches.push(match);
      inningsMap[match.id] = innings;
    }

    resolved = resolveKnockoutTeams(fixtures, matches, table, teams);
    for (const fixture of resolved.filter((f) => f.stage === "quarter_final")) {
      expect(fixture.teamAId).toBeTruthy();
      expect(fixture.teamBId).toBeTruthy();
      expect(canStartLiveScoring(fixture).ok).toBe(true);

      const winner = fixture.teamAId;
      const { match, innings } = completedMatch(
        fixture.id,
        fixture.matchId,
        fixture.stage,
        fixture.teamAId,
        fixture.teamBId,
        winner,
        100,
        95
      );
      matches.push(match);
      inningsMap[match.id] = innings;
    }

    resolved = resolveKnockoutTeams(fixtures, matches, table, teams);
    for (const fixture of resolved.filter((f) => f.stage === "semi_final")) {
      expect(fixture.teamAId).toBeTruthy();
      expect(fixture.teamBId).toBeTruthy();
      expect(canStartLiveScoring(fixture).ok).toBe(true);
      const winner = fixture.teamAId;
      const { match, innings } = completedMatch(
        fixture.id,
        fixture.matchId,
        fixture.stage,
        fixture.teamAId,
        fixture.teamBId,
        winner,
        110,
        100
      );
      matches.push(match);
      inningsMap[match.id] = innings;
    }

    resolved = resolveKnockoutTeams(fixtures, matches, table, teams);
    const finalFixture = resolved.find((f) => f.stage === "final");
    expect(finalFixture?.teamAId).toBeTruthy();
    expect(finalFixture?.teamBId).toBeTruthy();
    expect(canStartLiveScoring(finalFixture!).ok).toBe(true);

    const { match: finalMatch, innings: finalInnings } = completedMatch(
      finalFixture!.id,
      finalFixture!.matchId,
      "final",
      finalFixture!.teamAId,
      finalFixture!.teamBId,
      finalFixture!.teamAId,
      120,
      115
    );
    matches.push(finalMatch);
    inningsMap[finalMatch.id] = finalInnings;

    const allFixturesCompleted = resolved.map((f) => {
      const m = matches.find((x) => x.fixtureId === f.id);
      return m?.result ? { ...f, status: "completed" as const } : f;
    });
    allFixturesCompleted[allFixturesCompleted.length - 1] = {
      ...allFixturesCompleted[allFixturesCompleted.length - 1],
      status: "completed",
    };

    expect(canProgressStage("round_1", allFixturesCompleted)).toBe(true);
    expect(canProgressStage("integration", allFixturesCompleted)).toBe(true);
    expect(canProgressStage("quarter_final", allFixturesCompleted)).toBe(true);
    expect(canProgressStage("semi_final", allFixturesCompleted)).toBe(true);
    expect(deriveCurrentStage(allFixturesCompleted)).toBe("final");
  });

  it("computes NRR from actual innings overs, not played*6 fallback", () => {
    const seed = buildSeedData();
    const teamA = seed.teams[0];
    const teamB = seed.teams[1];
    const fixture = seed.fixtures.find((f) => f.matchId === "R1-1")!;

    const { match, innings } = completedMatch(
      fixture.id,
      fixture.matchId,
      "round_1",
      teamA.id,
      teamB.id,
      teamA.id,
      60,
      50
    );
    innings[0].overs = 5;
    innings[0].balls = 3;
    innings[1].overs = 6;
    innings[1].balls = 0;

    const table = calculatePointsTable(seed.teams, [match], { [match.id]: innings }, {
      pointsWin: 2,
      pointsTie: 1,
      pointsNr: 1,
    });

    const entryA = table.find((e) => e.teamId === teamA.id)!;
    expect(entryA.played).toBe(1);
    expect(entryA.nrr).not.toBe(0);
    expect(entryA.nrr).toBeCloseTo(60 / 5.5 - 50 / 6, 5);
  });
});
