import { NextResponse } from "next/server";
import { getFirebaseAdminDb, isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import { AdminAuthError, verifyAdminRequest } from "@/lib/server/verify-admin";
import {
  buildOfficialStandings,
  standingsPlayedCount,
  syncUnifiedStandingsToFirestore,
} from "@/lib/server/standings-publish";
import { syncKnockoutFixturesToFirestore } from "@/lib/server/tournament-sync";

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
    const { updated: fixturesUpdated, round2, quarterFinals } = await syncKnockoutFixturesToFirestore(db);
    const { scores: day1Scores } = buildOfficialStandings();

    return NextResponse.json({
      success: true,
      message:
        liveMatchCount > 0
          ? `Synced standings and updated ${fixturesUpdated} fixture(s) including Round 2 and quarter-finals.`
          : `Published Day 1 standings and updated ${fixturesUpdated} fixture(s).`,
      day1Matches: Object.keys(day1Scores).length,
      liveMatches: liveMatchCount,
      fixturesUpdated,
      round2,
      quarterFinals,
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
