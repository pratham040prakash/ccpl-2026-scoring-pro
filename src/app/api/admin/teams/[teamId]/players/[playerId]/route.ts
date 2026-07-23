import { NextResponse } from "next/server";
import { getFirebaseAdminDb, isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import { removePlayerFromTeam } from "@/lib/server/roster";
import { AdminAuthError, verifyAdminRequest } from "@/lib/server/verify-admin";

export const runtime = "nodejs";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ teamId: string; playerId: string }> }
) {
  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json({ success: false, message: "Firebase Admin not configured" }, { status: 503 });
  }

  try {
    await verifyAdminRequest(request);
    const { teamId, playerId } = await params;
    const db = getFirebaseAdminDb();
    if (!db) throw new Error("Firestore Admin SDK unavailable");

    const result = await removePlayerFromTeam(db, teamId, playerId);
    return NextResponse.json({
      success: true,
      message: "Player removed from roster",
      team: result.team,
    });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ success: false, message: error.message }, { status: error.status });
    }
    return NextResponse.json({ success: false, message: String(error) }, { status: 500 });
  }
}
