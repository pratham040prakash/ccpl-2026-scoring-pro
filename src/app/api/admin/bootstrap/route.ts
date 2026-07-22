import { NextResponse } from "next/server";
import { getFirebaseAdminApp, isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import { isAdminEmail } from "@/lib/auth/admin-emails";

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

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json({ success: false, message: "Missing auth token" }, { status: 401 });
  }

  try {
    const app = getFirebaseAdminApp();
    if (!app) throw new Error("Admin app unavailable");

    const { getAuth } = await import("firebase-admin/auth");
    const { getFirestore } = await import("firebase-admin/firestore");

    const decoded = await getAuth(app).verifyIdToken(token);
    const email = decoded.email;

    if (!isAdminEmail(email)) {
      return NextResponse.json(
        {
          success: false,
          message: "Your email is not in ADMIN_EMAILS. Ask the project owner to add it in Vercel env vars.",
        },
        { status: 403 }
      );
    }

    const db = getFirestore(app);
    const userRef = db.collection("users").doc(decoded.uid);
    const snap = await userRef.get();
    const now = new Date().toISOString();

    if (snap.exists) {
      await userRef.set(
        {
          role: "administrator",
          email: email || snap.data()?.email || "",
          updatedAt: now,
        },
        { merge: true }
      );
    } else {
      await userRef.set({
        uid: decoded.uid,
        email: email || "",
        displayName: decoded.name || "Admin",
        photoURL: decoded.picture || null,
        role: "administrator",
        createdAt: now,
        updatedAt: now,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Administrator access granted",
      role: "administrator",
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: String(error) }, { status: 500 });
  }
}
