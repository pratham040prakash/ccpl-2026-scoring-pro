import { doc, setDoc } from "firebase/firestore";
import type { Fixture, PointsTableEntry } from "@/types";
import { ROUND_2_CONFIRMED } from "@/data/round2-assignments";
import { mergeWithOfficialScores } from "@/lib/scores/official-results";
import { resolveFixturesWithScores } from "@/lib/scores/fixture-resolution";
import { buildPointsTableFromScores, loadStoredScores, mergeFixturesWithScores } from "@/lib/scores/store";
import { DEMO_DATA } from "@/lib/seed";
import { getFirebaseDb, isFirebaseConfigured } from "./config";
import { sanitizeForFirestore } from "./sanitize";

const COL = {
  pointsTable: "pointsTable",
  fixtures: "fixtures",
} as const;

/** Write Day 1 standings to Firestore so all users (mobile + desktop) see the same table. */
export async function publishDay1StandingsClient(): Promise<{
  teams: number;
  fixtures: number;
}> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured on this site.");
  }

  const db = getFirebaseDb();
  const scores = mergeWithOfficialScores(loadStoredScores());
  const table = buildPointsTableFromScores(DEMO_DATA.teams, DEMO_DATA.fixtures, scores);
  const mergedFixtures = mergeFixturesWithScores(DEMO_DATA.fixtures, scores);
  const now = new Date().toISOString();

  for (const entry of table) {
    await setDoc(
      doc(db, COL.pointsTable, entry.teamId),
      sanitizeForFirestore({ ...entry, updatedAt: now } satisfies PointsTableEntry & { updatedAt: string })
    );
  }

  let fixturesUpdated = 0;
  for (const fixture of mergedFixtures) {
    const score = scores[fixture.id];
    if (!score) continue;
    await setDoc(
      doc(db, COL.fixtures, fixture.id),
      sanitizeForFirestore({
        status: "completed",
        winnerId: score.winnerId,
        loserId: score.winnerId === score.teamAId ? score.teamBId : score.teamAId,
        updatedAt: now,
      }),
      { merge: true }
    );
    fixturesUpdated++;
  }

  window.dispatchEvent(new Event("ccpl-standings-updated"));
  return { teams: table.length, fixtures: fixturesUpdated };
}

/** Push confirmed Round 2 team assignments to Firestore fixtures. */
export async function publishRound2FixturesClient(): Promise<number> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured on this site.");
  }

  const db = getFirebaseDb();
  const now = new Date().toISOString();
  let updated = 0;

  for (const [fixtureId, assignment] of Object.entries(ROUND_2_CONFIRMED)) {
    await setDoc(
      doc(db, COL.fixtures, fixtureId),
      sanitizeForFirestore({
        teamAId: assignment.teamAId,
        teamBId: assignment.teamBId,
        teamAName: assignment.teamAName,
        teamBName: assignment.teamBName,
        status: "scheduled",
        updatedAt: now,
      } satisfies Partial<Fixture> & { updatedAt: string }),
      { merge: true }
    );
    updated += 1;
  }

  window.dispatchEvent(new Event("ccpl-standings-updated"));
  return updated;
}

/** Push quarter-final pairings (top 8 from points table) to Firestore. */
export async function publishQuarterFinalFixturesClient(): Promise<number> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured on this site.");
  }

  const db = getFirebaseDb();
  const scores = mergeWithOfficialScores(loadStoredScores());
  const resolved = resolveFixturesWithScores(DEMO_DATA.fixtures, scores);
  const now = new Date().toISOString();
  let updated = 0;

  for (const fixture of resolved.filter((entry) => entry.stage === "quarter_final")) {
    if (!fixture.teamAId?.trim() || !fixture.teamBId?.trim()) continue;
    await setDoc(
      doc(db, COL.fixtures, fixture.id),
      sanitizeForFirestore({
        teamAId: fixture.teamAId,
        teamBId: fixture.teamBId,
        teamAName: fixture.teamAName,
        teamBName: fixture.teamBName,
        status: "scheduled",
        updatedAt: now,
      } satisfies Partial<Fixture> & { updatedAt: string }),
      { merge: true }
    );
    updated += 1;
  }

  window.dispatchEvent(new Event("ccpl-standings-updated"));
  return updated;
}

export async function publishPointsTableClient(entries: PointsTableEntry[]): Promise<number> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured.");
  }

  const db = getFirebaseDb();
  const now = new Date().toISOString();
  for (const entry of entries) {
    await setDoc(
      doc(db, COL.pointsTable, entry.teamId),
      sanitizeForFirestore({ ...entry, updatedAt: now })
    );
  }
  window.dispatchEvent(new Event("ccpl-standings-updated"));
  return entries.length;
}
