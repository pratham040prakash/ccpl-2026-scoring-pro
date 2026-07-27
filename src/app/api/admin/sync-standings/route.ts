import { NextResponse } from "next/server";
import { getFirebaseAdminDb, isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import { AdminAuthError, verifyAdminRequest } from "@/lib/server/verify-admin";
import {
  buildOfficialStandings,
  publishOfficialStandingsToFirestore,
  standingsPlayedCount,
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

    const published = await publishOfficialStandingsToFirestore(db);
    const { table: computed } = buildOfficialStandings();

    return NextResponse.json({
      success: true,
      message: `Published ${published.matchesPublished} Day 1 matches to shared standings.`,
      matchesPublished: published.matchesPublished,
      teamsInTable: published.table.length,
      played: standingsPlayedCount(published.table),
      topTeam: published.table[0]?.teamName ?? computed[0]?.teamName,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
