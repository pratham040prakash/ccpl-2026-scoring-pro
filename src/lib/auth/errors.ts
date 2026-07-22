export function formatAuthError(error: unknown): string {
  const code = (error as { code?: string })?.code;
  const message = (error as { message?: string })?.message;

  switch (code) {
    case "auth/popup-blocked":
      return "Sign-in popup was blocked. Allow popups for this site, or try again (we will use redirect sign-in).";
    case "auth/popup-closed-by-user":
      return "Sign-in was cancelled. Please try again.";
    case "auth/unauthorized-domain":
      return "This domain is not authorized in Firebase. Add it under Authentication → Settings → Authorized domains.";
    case "auth/operation-not-allowed":
      return "Google sign-in is not enabled. Enable it in Firebase Console → Authentication → Sign-in method.";
    case "auth/invalid-api-key":
      return "Invalid Firebase API key. Check NEXT_PUBLIC_FIREBASE_* env vars and redeploy.";
    default:
      return message || "Sign-in failed. Please try again.";
  }
}
