import { describe, expect, it } from "vitest";
import type { Fixture } from "@/types";
import type { MatchSetupInput } from "@/types/match-setup";
import {
  deriveTeamsFromToss,
  deriveTeamsFromBattingFirst,
  deriveTossDecisionFromBattingFirst,
  resolveTossFromBattingFirst,
  validateMatchSetup,
  buildMatchFromSetup,
  defaultSetupDraft,
  hasLiveScoringStarted,
} from "@/lib/live/match-setup";
import { getTeamRoster } from "@/lib/live/player-roster";

const fixture: Fixture = {
  id: "fix-1",
  matchId: "R1-1",
  date: "2026-03-01",
  day: 1,
  startTime: "10:00",
  teamAId: "team-a",
  teamBId: "team-b",
  teamAName: "The Dial-In XI",
  teamBName: "Slog Squad",
  stage: "round_1",
  overs: 6,
  ground: "Cisco Ground",
  status: "scheduled",
  order: 1,
};

function fullSetup(
  tossWinnerId: string,
  tossDecision: "bat" | "bowl"
): MatchSetupInput {
  const draft = defaultSetupDraft(fixture);
  const { battingTeamId, bowlingTeamId } = deriveTeamsFromToss(
    fixture,
    tossWinnerId,
    tossDecision
  );
  const battingXi =
    battingTeamId === fixture.teamAId ? draft.playingXiA! : draft.playingXiB!;
  return {
    tossWinnerId,
    tossDecision,
    playingXiA: draft.playingXiA!,
    playingXiB: draft.playingXiB!,
    teamAMeta: draft.teamAMeta!,
    teamBMeta: draft.teamBMeta!,
    strikerId: battingXi[0]!,
    nonStrikerId: battingXi[1]!,
    openingBowlerId:
      (bowlingTeamId === fixture.teamAId ? draft.playingXiA! : draft.playingXiB!)[0]!,
    officials: {},
    settings: draft.settings!,
  };
}

describe("hasLiveScoringStarted", () => {
  it("is false before any delivery", () => {
    expect(
      hasLiveScoringStarted([
        {
          id: "inn1",
          matchId: "m1",
          teamId: "a",
          teamName: "A",
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
            batsman1Id: "",
            batsman2Id: "",
            batsman1Runs: 0,
            batsman2Runs: 0,
          },
          completed: false,
          nextSequence: 0,
          createdAt: "",
          updatedAt: "",
        },
      ])
    ).toBe(false);
  });
});

describe("deriveTossDecisionFromBattingFirst", () => {
  it("winner elected to bat when they bat first", () => {
    expect(deriveTossDecisionFromBattingFirst("team-b", "team-b")).toBe("bat");
  });

  it("winner elected to bowl when opponent bats first", () => {
    expect(deriveTossDecisionFromBattingFirst("team-b", "team-a")).toBe("bowl");
  });
});

describe("deriveTeamsFromBattingFirst", () => {
  it("sets bowling team as opponent", () => {
    const r = deriveTeamsFromBattingFirst(fixture, "team-a");
    expect(r.battingTeamId).toBe("team-a");
    expect(r.bowlingTeamId).toBe("team-b");
  });
});

describe("resolveTossFromBattingFirst", () => {
  it("combines batting-first choice with toss record", () => {
    const r = resolveTossFromBattingFirst(fixture, "team-b", "team-a");
    expect(r.tossDecision).toBe("bowl");
    expect(r.battingTeamName).toBe("The Dial-In XI");
    expect(r.bowlingTeamName).toBe("Slog Squad");
  });
});

describe("deriveTeamsFromToss", () => {
  it("winner bats first when choosing bat", () => {
    const r = deriveTeamsFromToss(fixture, "team-b", "bat");
    expect(r.battingTeamId).toBe("team-b");
    expect(r.bowlingTeamId).toBe("team-a");
    expect(r.battingTeamName).toBe("Slog Squad");
  });

  it("opponent bats when winner chooses bowl", () => {
    const r = deriveTeamsFromToss(fixture, "team-b", "bowl");
    expect(r.battingTeamId).toBe("team-a");
    expect(r.bowlingTeamId).toBe("team-b");
  });
});

describe("validateMatchSetup", () => {
  it("accepts a complete setup", () => {
    const input = fullSetup("team-b", "bowl");
    expect(validateMatchSetup(fixture, input)).toBeNull();
  });

  it("rejects missing toss winner", () => {
    const input = fullSetup("team-b", "bowl");
    input.tossWinnerId = "";
    expect(validateMatchSetup(fixture, input)).toMatch(/toss winner/i);
  });

  it("rejects same opening batters", () => {
    const input = fullSetup("team-a", "bat");
    input.nonStrikerId = input.strikerId;
    expect(validateMatchSetup(fixture, input)).toMatch(/different/i);
  });

  it("rejects bowler from batting team", () => {
    const input = fullSetup("team-a", "bat");
    input.openingBowlerId = input.strikerId;
    expect(validateMatchSetup(fixture, input)).toMatch(/bowling team/i);
  });
});

describe("buildMatchFromSetup", () => {
  it("stores toss-derived batting and bowling teams", () => {
    const input = fullSetup("team-b", "bowl");
    const match = buildMatchFromSetup(fixture, input);
    expect(match.tossWinnerId).toBe("team-b");
    expect(match.tossDecision).toBe("bowl");
    expect(match.battingFirstTeamId).toBe("team-a");
    expect(match.bowlingFirstTeamId).toBe("team-b");
    expect(match.battingTeamId).toBe("team-a");
    expect(match.bowlingTeamId).toBe("team-b");
    expect(match.setupCompletedAt).toBeTruthy();
    expect(match.playingXiA.length).toBeGreaterThanOrEqual(7);
  });

  it("defaults playing XI from roster", () => {
    const draft = defaultSetupDraft(fixture);
    expect(draft.playingXiA?.length).toBeLessThanOrEqual(11);
    expect(getTeamRoster(fixture.teamAName).length).toBeGreaterThan(0);
  });
});
