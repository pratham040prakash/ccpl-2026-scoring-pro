import { NextResponse } from "next/server";
import { getFirebaseAdminDb, isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import { AdminAuthError, verifyAdminRequest } from "@/lib/server/verify-admin";
import {
  buildOfficialStandings,
  standingsPlayedCount,
  syncUnifiedStandingsToFirestore,
} from "@/lib/server/standings-publish";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json(
      {
        success: false,
        message: "FIREBASE_SERVICE_ACCOUNT_JSON is not configured on the server.",
      },
      { status: 503 }
    );
  }

  try {
    await verifyAdminRequest(request);
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ success: false, message: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : String(error) },
      { status: 401 }
    );
  }

  try {
    const db = getFirebaseAdminDb();
    if (!db) throw new Error("Firestore Admin SDK unavailable");

    const { table, liveMatchCount } = await syncUnifiedStandingsToFirestore(db);
    const { scores: day1Scores } = buildOfficialStandings();

    return NextResponse.json({
      success: true,
      message:
        liveMatchCount > 0
          ? `Synced Day 1 (${Object.keys(day1Scores).length} matches) plus ${liveMatchCount} live match(es) to shared standings.`
          : `Published ${Object.keys(day1Scores).length} Day 1 matches to shared standings.`,
      day1Matches: Object.keys(day1Scores).length,
      liveMatches: liveMatchCount,
      teamsInTable: table.length,
      played: standingsPlayedCount(table),
      topTeam: table[0]?.teamName,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
