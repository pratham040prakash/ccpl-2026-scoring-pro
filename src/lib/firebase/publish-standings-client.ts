import { doc, setDoc } from "firebase/firestore";
import type { PointsTableEntry } from "@/types";
import { getOfficialDay1Scores, getBundledOfficialPointsTable } from "@/lib/scores/official-results";
import { mergeFixturesWithScores } from "@/lib/scores/store";
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
  const table = getBundledOfficialPointsTable();
  const scores = getOfficialDay1Scores();
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
