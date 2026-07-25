import { NextResponse } from "next/server";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import { getFirebaseAdminDb, isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import { AdminAuthError, verifyAdminRequest } from "@/lib/server/verify-admin";

export const runtime = "nodejs";

type Check = { name: string; pass: boolean; detail: string };

export async function GET(request: Request) {
  const checks: Check[] = [];

  checks.push({
    name: "Firebase client config",
    pass: isFirebaseConfigured(),
    detail: isFirebaseConfigured() ? "NEXT_PUBLIC_FIREBASE_* configured" : "Demo mode — add Firebase env vars",
  });

  checks.push({
    name: "Firebase Admin SDK",
    pass: isFirebaseAdminConfigured(),
    detail: isFirebaseAdminConfigured()
      ? "FIREBASE_SERVICE_ACCOUNT_JSON present"
      : "Missing — finalize/seed API will fail",
  });

  checks.push({
    name: "Admin emails",
    pass: Boolean(process.env.ADMIN_EMAILS?.trim()),
    detail: process.env.ADMIN_EMAILS ? "ADMIN_EMAILS set" : "Set ADMIN_EMAILS in Vercel",
  });

  if (isFirebaseAdminConfigured()) {
    try {
      const db = getFirebaseAdminDb();
      if (db) {
        for (const col of ["teams", "players", "fixtures", "settings"]) {
          const snap = await db.collection(col).limit(1).get();
          checks.push({
            name: `${col} collection`,
            pass: !snap.empty || col === "settings",
            detail: snap.empty ? "Empty — run Seed Database" : "OK",
          });
        }
      }
    } catch (error) {
      checks.push({
        name: "Firestore connectivity",
        pass: false,
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const passCount = checks.filter((c) => c.pass).length;
  return NextResponse.json({
    success: passCount === checks.length,
    score: Math.round((passCount / checks.length) * 100),
    checks,
  });
}

export async function POST(request: Request) {
  try {
    await verifyAdminRequest(request);
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ success: false, message: error.message }, { status: error.status });
    }
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  return GET(request);
}
