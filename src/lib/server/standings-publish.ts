import type { Firestore } from "firebase-admin/firestore";
import type { Fixture, PointsTableEntry } from "@/types";
import { buildSeedData } from "@/lib/seed";
import { getOfficialDay1Scores } from "@/lib/scores/official-results";
import {
  buildPointsTableFromScores,
  mergeFixturesWithScores,
} from "@/lib/scores/store";

export function buildOfficialStandings(): {
  table: PointsTableEntry[];
  scores: ReturnType<typeof getOfficialDay1Scores>;
  fixtures: Fixture[];
} {
  const seed = buildSeedData();
  const scores = getOfficialDay1Scores();
  const table = buildPointsTableFromScores(seed.teams, seed.fixtures, scores);
  return { table, scores, fixtures: seed.fixtures };
}

export function standingsPlayedCount(table: PointsTableEntry[]): number {
  return table.reduce((sum, entry) => sum + entry.played, 0);
}

/** Write official Day 1 standings + completed fixtures to Firestore (shared for all users). */
export async function publishOfficialStandingsToFirestore(
  db: Firestore
): Promise<{ table: PointsTableEntry[]; matchesPublished: number }> {
  const { table, scores, fixtures } = buildOfficialStandings();
  const mergedFixtures = mergeFixturesWithScores(fixtures, scores);
  const now = new Date().toISOString();
  const batch = db.batch();

  for (const entry of table) {
    batch.set(db.collection("pointsTable").doc(entry.teamId), {
      ...entry,
      updatedAt: now,
    });
  }

  for (const fixture of mergedFixtures) {
    const score = scores[fixture.id];
    if (!score) continue;
    batch.set(
      db.collection("fixtures").doc(fixture.id),
      {
        status: "completed",
        winnerId: score.winnerId,
        loserId: score.winnerId === score.teamAId ? score.teamBId : score.teamAId,
        updatedAt: now,
      },
      { merge: true }
    );
  }

  await batch.commit();
  return { table, matchesPublished: Object.keys(scores).length };
}
