import type { Fixture } from "@/types";

/** Confirmed CCPL 2026 Semi-Finals (Thu 2026-07-30). */
export const SEMI_FINAL_CONFIRMED: Record<
  string,
  { teamAId: string; teamAName: string; teamBId: string; teamBName: string }
> = {
  sf2: {
    teamAId: "play-bold-xi",
    teamAName: "Play Bold XI",
    teamBId: "rising-stars",
    teamBName: "Rising Stars",
  },
};

export function applyConfirmedSemiFinalFixtures(fixtures: Fixture[]): Fixture[] {
  return fixtures.map((fixture) => {
    const assignment = SEMI_FINAL_CONFIRMED[fixture.id];
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
