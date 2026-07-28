import type { Firestore } from "firebase-admin/firestore";
import type { Fixture, Innings, Match, PointsTableEntry } from "@/types";
import type { StoredMatchScore } from "@/types/scores";
import { buildStoredScoreFromLive } from "@/lib/engine/match-finalization";
import { buildSeedData } from "@/lib/seed";
import { getOfficialDay1Scores } from "@/lib/scores/official-results";
import {
  buildPointsTableFromScores,
  mergeFixturesWithScores,
} from "@/lib/scores/store";

function isCompletedFirestoreMatch(match: Match): boolean {
  return (
    match.status === "completed" ||
    match.locked === true ||
    match.published === true
  );
}

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

/** Official Day 1 CSV + any finalized live matches in Firestore. */
export async function buildUnifiedStandingsFromFirestore(
  db: Firestore
): Promise<{
  table: PointsTableEntry[];
  scores: Record<string, StoredMatchScore>;
  liveMatchCount: number;
}> {
  const seed = buildSeedData();
  const mergedScores: Record<string, StoredMatchScore> = {
    ...getOfficialDay1Scores(),
  };

  const matchesSnap = await db.collection("matches").get();
  const completedMatches = matchesSnap.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }) as Match)
    .filter(isCompletedFirestoreMatch);

  let liveMatchCount = 0;
  for (const match of completedMatches) {
    const inningsSnap = await db
      .collection("innings")
      .where("matchId", "==", match.id)
      .orderBy("inningsNumber")
      .get();

    const inningsList = inningsSnap.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() }) as Innings
    );
    if (inningsList.length < 2) continue;

    const stored = buildStoredScoreFromLive(match, inningsList);
    if (!stored) continue;

    mergedScores[match.fixtureId] = stored;
    if (stored.source === "live") liveMatchCount += 1;
  }

  const table = buildPointsTableFromScores(
    seed.teams,
    seed.fixtures,
    mergedScores
  );
  return { table, scores: mergedScores, liveMatchCount };
}

/** Persist a points table snapshot to Firestore for realtime subscribers. */
export async function writePointsTableToFirestore(
  db: Firestore,
  table: PointsTableEntry[]
): Promise<void> {
  const now = new Date().toISOString();
  const batch = db.batch();
  for (const entry of table) {
    batch.set(db.collection("pointsTable").doc(entry.teamId), {
      ...entry,
      updatedAt: now,
    });
  }
  await batch.commit();
}

/** Recalculate unified standings and write to Firestore (after finalize or admin sync). */
export async function syncUnifiedStandingsToFirestore(
  db: Firestore
): Promise<{ table: PointsTableEntry[]; liveMatchCount: number }> {
  const { table, liveMatchCount } = await buildUnifiedStandingsFromFirestore(db);
  await writePointsTableToFirestore(db, table);
  return { table, liveMatchCount };
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
