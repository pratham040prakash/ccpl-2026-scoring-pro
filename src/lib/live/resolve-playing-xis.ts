import type { Fixture, Innings, Match } from "@/types";
import { resolvePlayingXi, type RosterPlayer } from "@/lib/live/player-roster";

export function resolveBattingBowlingXis(
  fixture: Fixture | undefined,
  match: Match | null | undefined,
  innings: Innings | null | undefined
): { battingXi: RosterPlayer[]; bowlingXi: RosterPlayer[] } {
  if (!fixture || !innings) return { battingXi: [], bowlingXi: [] };

  const isTeamA = innings.teamId === fixture.teamAId;
  const battingXi = resolvePlayingXi(
    isTeamA ? fixture.teamAName : fixture.teamBName,
    isTeamA ? match?.playingXiA : match?.playingXiB
  );
  const bowlingXi = resolvePlayingXi(
    isTeamA ? fixture.teamBName : fixture.teamAName,
    isTeamA ? match?.playingXiB : match?.playingXiA
  );

  return { battingXi, bowlingXi };
}
