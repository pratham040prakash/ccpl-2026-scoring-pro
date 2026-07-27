import teamsData from "@/data/teams.json";
import type { Fixture, Match, TossDecision } from "@/types";
import type { MatchSetupInput, TeamPlayingMeta } from "@/types/match-setup";
import { getTeamRoster, type RosterPlayer } from "@/lib/live/player-roster";

export const MIN_PLAYING_XI = 7;
export const MAX_PLAYING_XI = 11;

export interface TossTeamsResult {
  battingTeamId: string;
  bowlingTeamId: string;
  battingTeamName: string;
  bowlingTeamName: string;
}

export function teamName(fixture: Fixture, teamId: string): string {
  return teamId === fixture.teamAId ? fixture.teamAName : fixture.teamBName;
}

export function opponentTeamId(fixture: Fixture, teamId: string): string {
  return teamId === fixture.teamAId ? fixture.teamBId : fixture.teamAId;
}

/** Derive batting/bowling from toss — never allow manual bowling team pick. */
export function deriveTeamsFromToss(
  fixture: Fixture,
  tossWinnerId: string,
  tossDecision: TossDecision
): TossTeamsResult {
  const opponentId = opponentTeamId(fixture, tossWinnerId);
  const battingTeamId = tossDecision === "bat" ? tossWinnerId : opponentId;
  const bowlingTeamId = tossDecision === "bat" ? opponentId : tossWinnerId;
  return deriveTeamsFromBattingFirst(fixture, battingTeamId);
}

/** Primary input: which team bats first → bowling team is the opponent. */
export function deriveTeamsFromBattingFirst(
  fixture: Fixture,
  battingFirstTeamId: string
): TossTeamsResult {
  const bowlingTeamId = opponentTeamId(fixture, battingFirstTeamId);
  return {
    battingTeamId: battingFirstTeamId,
    bowlingTeamId,
    battingTeamName: teamName(fixture, battingFirstTeamId),
    bowlingTeamName: teamName(fixture, bowlingTeamId),
  };
}

/** Map toss winner + batting-first choice to elected bat/bowl. */
export function deriveTossDecisionFromBattingFirst(
  tossWinnerId: string,
  battingFirstTeamId: string
): TossDecision {
  return battingFirstTeamId === tossWinnerId ? "bat" : "bowl";
}

export function resolveTossFromBattingFirst(
  fixture: Fixture,
  tossWinnerId: string,
  battingFirstTeamId: string
): { tossDecision: TossDecision } & TossTeamsResult {
  const tossDecision = deriveTossDecisionFromBattingFirst(tossWinnerId, battingFirstTeamId);
  return {
    tossDecision,
    ...deriveTeamsFromBattingFirst(fixture, battingFirstTeamId),
  };
}

export function formatStage(stage: string): string {
  return stage.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function validatePlayingXi(
  ids: string[],
  roster: RosterPlayer[],
  teamLabel: string
): string | null {
  if (ids.length < MIN_PLAYING_XI) {
    return `${teamLabel}: select at least ${MIN_PLAYING_XI} players (currently ${ids.length}).`;
  }
  if (ids.length > MAX_PLAYING_XI) {
    return `${teamLabel}: maximum ${MAX_PLAYING_XI} players allowed.`;
  }
  const rosterIds = new Set(roster.map((p) => p.id));
  if (ids.some((id) => !rosterIds.has(id))) {
    return `${teamLabel}: invalid player in playing XI.`;
  }
  if (new Set(ids).size !== ids.length) {
    return `${teamLabel}: duplicate players in playing XI.`;
  }
  return null;
}

export function validateMatchSetup(
  fixture: Fixture,
  input: MatchSetupInput
): string | null {
  if (!input.tossWinnerId) return "Select the toss winner.";
  if (input.tossWinnerId !== fixture.teamAId && input.tossWinnerId !== fixture.teamBId) {
    return "Invalid toss winner.";
  }
  if (!input.tossDecision) return "Select which team bats first.";

  const rosterA = getTeamRoster(fixture.teamAName);
  const rosterB = getTeamRoster(fixture.teamBName);
  const errA = validatePlayingXi(input.playingXiA, rosterA, fixture.teamAName);
  if (errA) return errA;
  const errB = validatePlayingXi(input.playingXiB, rosterB, fixture.teamBName);
  if (errB) return errB;

  const { battingTeamId, bowlingTeamId } = deriveTeamsFromToss(
    fixture,
    input.tossWinnerId,
    input.tossDecision
  );
  const battingXi =
    battingTeamId === fixture.teamAId ? input.playingXiA : input.playingXiB;

  if (!input.strikerId || !input.nonStrikerId) {
    return "Select opening striker and non-striker.";
  }
  if (input.strikerId === input.nonStrikerId) {
    return "Striker and non-striker must be different players.";
  }
  if (!battingXi.includes(input.strikerId) || !battingXi.includes(input.nonStrikerId)) {
    return "Opening batters must be from the batting team's playing XI.";
  }

  const bowlingXi =
    bowlingTeamId === fixture.teamAId ? input.playingXiA : input.playingXiB;
  if (!input.openingBowlerId) return "Select the opening bowler.";
  if (!bowlingXi.includes(input.openingBowlerId)) {
    return "Opening bowler must be from the bowling team's playing XI.";
  }

  return null;
}

export function buildMatchFromSetup(fixture: Fixture, input: MatchSetupInput): Match {
  const now = new Date().toISOString();
  const { battingTeamId, bowlingTeamId } = deriveTeamsFromToss(
    fixture,
    input.tossWinnerId,
    input.tossDecision
  );

  return {
    id: fixture.matchDocId ?? fixture.id,
    fixtureId: fixture.id,
    matchId: fixture.matchId,
    stage: fixture.stage,
    status: "live",
    date: fixture.date,
    startTime: fixture.startTime,
    ground: input.settings.ground ?? fixture.ground,
    overs: input.settings.overs ?? fixture.overs,
    teamAId: fixture.teamAId,
    teamBId: fixture.teamBId,
    teamAName: fixture.teamAName,
    teamBName: fixture.teamBName,
    battingTeamId,
    bowlingTeamId,
    battingFirstTeamId: battingTeamId,
    bowlingFirstTeamId: bowlingTeamId,
    playingXiA: input.playingXiA,
    playingXiB: input.playingXiB,
    teamAMeta: input.teamAMeta,
    teamBMeta: input.teamBMeta,
    tossWinnerId: input.tossWinnerId,
    tossDecision: input.tossDecision,
    openingStrikerId: input.strikerId,
    openingNonStrikerId: input.nonStrikerId,
    openingBowlerId: input.openingBowlerId,
    officials: input.officials,
    matchSettings: input.settings,
    setupCompletedAt: now,
    locked: false,
    published: true,
    shareSlug: fixture.id,
    createdAt: now,
    updatedAt: now,
  };
}

function captainDefaults(teamName: string): TeamPlayingMeta {
  const team = teamsData.find((t) => t.name === teamName);
  const roster = getTeamRoster(teamName);
  const captainId = team?.captain
    ? roster.find((p) => p.name === team.captain)?.id
    : undefined;
  return { captainId, substituteIds: [] };
}

export function defaultSetupDraft(fixture: Fixture): Partial<MatchSetupInput> {
  const rosterA = getTeamRoster(fixture.teamAName);
  const rosterB = getTeamRoster(fixture.teamBName);
  const defaultA = rosterA.slice(0, MAX_PLAYING_XI).map((p) => p.id);
  const defaultB = rosterB.slice(0, MAX_PLAYING_XI).map((p) => p.id);

  return {
    playingXiA: defaultA,
    playingXiB: defaultB,
    teamAMeta: captainDefaults(fixture.teamAName),
    teamBMeta: captainDefaults(fixture.teamBName),
    officials: {},
    settings: {
      overs: fixture.overs,
      powerplayOvers: Math.min(fixture.overs, 2),
      ground: fixture.ground,
      ballType: "tennis",
      pitch: "balanced",
      matchType: formatStage(fixture.stage),
      superOverEnabled: true,
      dlsEnabled: false,
    },
  };
}

export function isMatchSetupComplete(match: Match | null | undefined): boolean {
  return Boolean(
    match?.setupCompletedAt &&
      match.tossWinnerId &&
      match.tossDecision &&
      match.playingXiA?.length &&
      match.playingXiB?.length
  );
}

export function tossSummaryLines(
  fixture: Fixture,
  tossWinnerId: string,
  tossDecision: TossDecision
): string[] {
  const winnerName = teamName(fixture, tossWinnerId);
  const { battingTeamName, bowlingTeamName } = deriveTeamsFromToss(
    fixture,
    tossWinnerId,
    tossDecision
  );
  return [
    `Toss won by ${winnerName}`,
    `Elected to ${tossDecision === "bat" ? "Bat" : "Bowl"}`,
    `${battingTeamName} will bat first`,
    `${bowlingTeamName} will bowl first`,
  ];
}

export function metaForTeam(
  meta: TeamPlayingMeta | undefined,
  playerId: string
): Pick<TeamPlayingMeta, "captainId" | "viceCaptainId" | "wicketKeeperId"> & {
  isSubstitute: boolean;
} {
  return {
    captainId: meta?.captainId,
    viceCaptainId: meta?.viceCaptainId,
    wicketKeeperId: meta?.wicketKeeperId,
    isSubstitute: meta?.substituteIds?.includes(playerId) ?? false,
  };
}
