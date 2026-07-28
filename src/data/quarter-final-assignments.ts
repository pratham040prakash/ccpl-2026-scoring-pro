import type { Fixture } from "@/types";

/** Confirmed CCPL 2026 Quarter-Finals (Wed 2026-07-29) from fair top-8 table. */
export const QUARTER_FINAL_CONFIRMED: Record<
  string,
  { teamAId: string; teamAName: string; teamBId: string; teamBName: string }
> = {
  qf1: {
    teamAId: "aura-strikers",
    teamAName: "Aura Strikers",
    teamBId: "11-daulath-s",
    teamBName: "11 Daulath's",
  },
  qf2: {
    teamAId: "slog-squad",
    teamAName: "Slog Squad",
    teamBId: "play-bold-xi",
    teamBName: "Play Bold XI",
  },
  qf3: {
    teamAId: "rising-stars",
    teamAName: "Rising Stars",
    teamBId: "royal-ciscoians-bengaluru-rcb",
    teamBName: "Royal Ciscoians Bengaluru RCB",
  },
  qf4: {
    teamAId: "bengaluru-blasters",
    teamAName: "Bengaluru Blasters",
    teamBId: "the-cluster-xi",
    teamBName: "The Cluster XI",
  },
};

export function applyConfirmedQuarterFinalFixtures(fixtures: Fixture[]): Fixture[] {
  return fixtures.map((fixture) => {
    const assignment = QUARTER_FINAL_CONFIRMED[fixture.id];
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
