import { verifyFirebaseIdToken } from "@/lib/firebase/verify-id-token";
import { isAdminEmail } from "@/lib/auth/admin-emails";

export async function verifyAdminRequest(request: Request): Promise<{
  uid: string;
  email?: string;
}> {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    throw new AdminAuthError("Missing auth token", 401);
  }

  const decoded = await verifyFirebaseIdToken(token);
  if (!isAdminEmail(decoded.email)) {
    throw new AdminAuthError("Administrator access required", 403);
  }

  return { uid: decoded.uid, email: decoded.email };
}

export class AdminAuthError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = "AdminAuthError";
  }
}
