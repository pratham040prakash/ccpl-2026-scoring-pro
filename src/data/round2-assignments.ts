import type { Fixture } from "@/types";

/** Confirmed CCPL 2026 Round 2 pairings (2026-07-28). */
export const ROUND_2_CONFIRMED: Record<
  string,
  { teamAId: string; teamAName: string; teamBId: string; teamBName: string }
> = {
  "r2-1": {
    teamAId: "data-warriors",
    teamAName: "Data Warriors",
    teamBId: "11-daulath-s",
    teamBName: "11 Daulath's",
  },
  "r2-2": {
    teamAId: "play-bold-xi",
    teamAName: "Play Bold XI",
    teamBId: "lifecycle-cricket-team",
    teamBName: "Lifecycle Cricket Team",
  },
};

export function applyConfirmedRound2Fixtures(fixtures: Fixture[]): Fixture[] {
  return fixtures.map((fixture) => {
    const assignment = ROUND_2_CONFIRMED[fixture.id];
    if (!assignment) return fixture;
    return {
      ...fixture,
      teamAId: assignment.teamAId,
      teamBId: assignment.teamBId,
      teamAName: assignment.teamAName,
      teamBName: assignment.teamBName,
    };
  });
}
