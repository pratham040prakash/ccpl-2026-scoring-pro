import type { Firestore } from "firebase-admin/firestore";
import type { Fixture, Innings, Match, PointsTableEntry } from "@/types";
import type { StoredMatchScore } from "@/types/scores";
import { buildStoredScoreFromLive } from "@/lib/engine/match-finalization";
import { buildSeedData } from "@/lib/seed";
import { getAllOfficialScores } from "@/lib/scores/official-results";
import { buildFairPointsTableFromScores } from "@/lib/scores/fair-standings";
import { resolveFixturesWithScores } from "@/lib/scores/fixture-resolution";
import { mergeFixturesWithScores } from "@/lib/scores/store";

function isStandingsEligibleMatch(match: Match): boolean {
  if (match.status === "completed") return true;
  return match.locked === true && Boolean(match.result?.winnerName || match.result?.summary);
}

function resolveFixtureKey(match: Match, fixtures: Fixture[]): string {
  if (match.fixtureId && fixtures.some((fixture) => fixture.id === match.fixtureId)) {
    return match.fixtureId;
  }
  const fixture = fixtures.find(
    (entry) => entry.matchId.toUpperCase() === match.matchId?.toUpperCase()
  );
  return fixture?.id ?? match.fixtureId;
}

export function buildOfficialStandings(): {
  table: PointsTableEntry[];
  scores: ReturnType<typeof getAllOfficialScores>;
  fixtures: Fixture[];
} {
  const seed = buildSeedData();
  const scores = getAllOfficialScores();
  const fixtures = resolveFixturesWithScores(seed.fixtures, scores, seed.teams);
  const table = buildFairPointsTableFromScores(seed.teams, fixtures, scores);
  return { table, scores, fixtures };
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
    ...getAllOfficialScores(),
  };

  const matchesSnap = await db.collection("matches").get();
  const completedMatches = matchesSnap.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }) as Match)
    .filter(isStandingsEligibleMatch);

  let liveMatchCount = 0;
  for (const match of completedMatches) {
    const inningsSnap = await db.collection("innings").where("matchId", "==", match.id).get();

    const inningsList = inningsSnap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }) as Innings)
      .sort((a, b) => a.inningsNumber - b.inningsNumber);

    if (inningsList.length < 2) continue;

    const stored = buildStoredScoreFromLive(match, inningsList);
    if (!stored) continue;

    mergedScores[resolveFixtureKey(match, seed.fixtures)] = stored;
    if (stored.source === "live") liveMatchCount += 1;
  }

  const table = buildFairPointsTableFromScores(
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

/** Write bundled fair standings + completed fixtures to Firestore (shared for all users). */
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
