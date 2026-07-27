import type { Fixture, Innings, Match } from "@/types";
import { opponentTeamId } from "@/lib/live/match-setup";
import { resolvePlayingXi, type RosterPlayer } from "@/lib/live/player-roster";

export function resolveBattingBowlingXis(
  fixture: Fixture | undefined,
  match: Match | null | undefined,
  innings: Innings | null | undefined
): { battingXi: RosterPlayer[]; bowlingXi: RosterPlayer[] } {
  if (!fixture || !innings) return { battingXi: [], bowlingXi: [] };

  const battingTeamId = innings.teamId;
  const bowlingTeamId =
    match?.battingTeamId && match?.bowlingTeamId && innings.teamId === match.battingTeamId
      ? match.bowlingTeamId
      : opponentTeamId(fixture, battingTeamId);

  const battingTeamName =
    battingTeamId === fixture.teamAId ? fixture.teamAName : fixture.teamBName;
  const bowlingTeamName =
    bowlingTeamId === fixture.teamAId ? fixture.teamAName : fixture.teamBName;

  const battingXi = resolvePlayingXi(
    battingTeamName,
    battingTeamId === fixture.teamAId ? match?.playingXiA : match?.playingXiB
  );
  const bowlingXi = resolvePlayingXi(
    bowlingTeamName,
    bowlingTeamId === fixture.teamAId ? match?.playingXiA : match?.playingXiB
  );

  return { battingXi, bowlingXi };
}
