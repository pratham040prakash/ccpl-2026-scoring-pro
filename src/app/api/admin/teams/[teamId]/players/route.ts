import { NextResponse } from "next/server";
import { getFirebaseAdminDb, isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import { addPlayerToTeam, listTeamPlayers } from "@/lib/server/roster";
import { AdminAuthError, verifyAdminRequest } from "@/lib/server/verify-admin";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json({ success: false, message: "Firebase Admin not configured" }, { status: 503 });
  }

  try {
    await verifyAdminRequest(request);
    const { teamId } = await params;
    const db = getFirebaseAdminDb();
    if (!db) throw new Error("Firestore Admin SDK unavailable");

    const players = await listTeamPlayers(db, teamId);
    return NextResponse.json({ success: true, players });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ success: false, message: error.message }, { status: error.status });
    }
    return NextResponse.json({ success: false, message: String(error) }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json({ success: false, message: "Firebase Admin not configured" }, { status: 503 });
  }

  try {
    await verifyAdminRequest(request);
    const { teamId } = await params;
    const body = (await request.json()) as { name?: string; email?: string | null };
    const name = body.name?.trim();

    if (!name) {
      return NextResponse.json({ success: false, message: "Player name is required" }, { status: 400 });
    }

    const db = getFirebaseAdminDb();
    if (!db) throw new Error("Firestore Admin SDK unavailable");

    const result = await addPlayerToTeam(db, teamId, name, body.email ?? null);
    return NextResponse.json({
      success: true,
      message: `Added ${result.player.name} to roster`,
      player: result.player,
      team: result.team,
    });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ success: false, message: error.message }, { status: error.status });
    }
    return NextResponse.json({ success: false, message: String(error) }, { status: 500 });
  }
}
