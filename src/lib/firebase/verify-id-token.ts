/** Verify Firebase ID tokens via Identity Toolkit REST API (avoids firebase-admin/auth on Vercel). */
export async function verifyFirebaseIdToken(idToken: string): Promise<{
  uid: string;
  email?: string;
  name?: string;
  picture?: string;
}> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) {
    throw new Error("NEXT_PUBLIC_FIREBASE_API_KEY is not configured on the server.");
  }

  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    }
  );

  const data = (await res.json()) as {
    users?: Array<{
      localId?: string;
      email?: string;
      displayName?: string;
      photoUrl?: string;
    }>;
    error?: { message?: string };
  };

  if (!res.ok) {
    throw new Error(data.error?.message || "Invalid auth token");
  }

  const user = data.users?.[0];
  if (!user?.localId) {
    throw new Error("Invalid auth token");
  }

  return {
    uid: user.localId,
    email: user.email,
    name: user.displayName,
    picture: user.photoUrl,
  };
}
