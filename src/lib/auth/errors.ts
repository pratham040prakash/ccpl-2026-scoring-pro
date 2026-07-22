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
      return "This sign-in method is not enabled. Enable Email/Password or Google in Firebase Console → Authentication → Sign-in method.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
    case "auth/invalid-login-credentials":
      return "Incorrect email or password. Check your credentials and try again.";
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/too-many-requests":
      return "Too many failed attempts. Wait a few minutes and try again.";
    case "auth/invalid-api-key":
      return "Invalid Firebase API key. Check NEXT_PUBLIC_FIREBASE_* env vars and redeploy.";
    default:
      return message || "Sign-in failed. Please try again.";
  }
}
