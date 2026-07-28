import { NextResponse } from "next/server";
import { getFirebaseAdminDb, isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import {
  buildOfficialStandings,
  buildUnifiedStandingsFromFirestore,
  standingsPlayedCount,
} from "@/lib/server/standings-publish";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

export async function GET() {
  const { table: official } = buildOfficialStandings();
  const officialPlayed = standingsPlayedCount(official);

  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json(
      { table: official, source: "official", played: officialPlayed },
      { headers: NO_STORE }
    );
  }

  try {
    const db = getFirebaseAdminDb();
    if (!db) {
      return NextResponse.json(
        { table: official, source: "official", played: officialPlayed },
        { headers: NO_STORE }
      );
    }

    const { table, liveMatchCount } = await buildUnifiedStandingsFromFirestore(db);
    const played = standingsPlayedCount(table);

    return NextResponse.json(
      {
        table,
        source: liveMatchCount > 0 ? "unified" : "official",
        played,
        liveMatches: liveMatchCount,
      },
      { headers: NO_STORE }
    );
  } catch (error) {
    return NextResponse.json(
      {
        table: official,
        source: "official",
        played: officialPlayed,
        warning: error instanceof Error ? error.message : String(error),
      },
      { headers: NO_STORE }
    );
  }
}
