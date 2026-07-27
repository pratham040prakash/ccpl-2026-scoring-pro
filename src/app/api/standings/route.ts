import { NextResponse } from "next/server";
import type { PointsTableEntry } from "@/types";
import { getFirebaseAdminDb, isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import {
  buildOfficialStandings,
  publishOfficialStandingsToFirestore,
  standingsPlayedCount,
} from "@/lib/server/standings-publish";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

export async function GET() {
  const { table: computed } = buildOfficialStandings();
  const computedPlayed = standingsPlayedCount(computed);

  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json(
      { table: computed, source: "official", played: computedPlayed },
      { headers: NO_STORE }
    );
  }

  try {
    const db = getFirebaseAdminDb();
    if (!db) {
      return NextResponse.json(
        { table: computed, source: "official", played: computedPlayed },
        { headers: NO_STORE }
      );
    }

    const snap = await db.collection("pointsTable").orderBy("rank").get();
    let remoteTable = snap.docs.map((doc) => doc.data() as PointsTableEntry);
    let remotePlayed = standingsPlayedCount(remoteTable);

    if (remotePlayed < computedPlayed) {
      const published = await publishOfficialStandingsToFirestore(db);
      remoteTable = published.table;
      remotePlayed = standingsPlayedCount(remoteTable);
    }

    const table = remotePlayed >= computedPlayed ? remoteTable : computed;
    const played = standingsPlayedCount(table);

    return NextResponse.json(
      {
        table,
        source: remotePlayed >= computedPlayed ? "firestore" : "official",
        played,
      },
      { headers: NO_STORE }
    );
  } catch (error) {
    return NextResponse.json(
      {
        table: computed,
        source: "official",
        played: computedPlayed,
        warning: error instanceof Error ? error.message : String(error),
      },
      { headers: NO_STORE }
    );
  }
}
