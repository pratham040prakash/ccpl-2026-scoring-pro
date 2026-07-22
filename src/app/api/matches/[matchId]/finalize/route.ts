import { NextResponse } from "next/server";
import { getFirebaseAdminDb, isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import { verifyFirebaseIdToken } from "@/lib/firebase/verify-id-token";
import type { Firestore } from "firebase-admin/firestore";
import { finalizeMatchOnServer } from "@/lib/server/tournament-sync";

export const runtime = "nodejs";

async function assertScorerOrAdmin(db: Firestore, uid: string) {
  const snap = await db.collection("users").doc(uid).get();
  const role = snap.data()?.role;
  if (role !== "administrator" && role !== "scorer") {
    throw new Error("Scorer or administrator access required");
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ matchId: string }> }
) {
  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json(
      { success: false, message: "FIREBASE_SERVICE_ACCOUNT_JSON not configured" },
      { status: 503 }
    );
  }

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json({ success: false, message: "Missing auth token" }, { status: 401 });
  }

  try {
    const db = getFirebaseAdminDb();
    if (!db) throw new Error("Firestore Admin unavailable");

    const decoded = await verifyFirebaseIdToken(token);
    await assertScorerOrAdmin(db, decoded.uid);

    const { matchId } = await context.params;
    const result = await finalizeMatchOnServer(db, matchId);

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
