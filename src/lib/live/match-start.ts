import type { Fixture } from "@/types";
import { defaultPlayingXi } from "@/lib/live/player-roster";

export function canStartLiveScoring(fixture: Fixture): { ok: true } | { ok: false; reason: string } {
  if (!fixture.teamAId?.trim() || !fixture.teamBId?.trim()) {
    if (fixture.placeholderA || fixture.placeholderB) {
      return {
        ok: false,
        reason:
          "Knockout teams are not resolved yet. Complete and finalize the prior stage matches first.",
      };
    }
    return {
      ok: false,
      reason: "This fixture has no team IDs. Run Admin → Seed Database, then try again.",
    };
  }

  const xiA = defaultPlayingXi(fixture.teamAName);
  const xiB = defaultPlayingXi(fixture.teamBName);

  if (xiA.length < 2) {
    return {
      ok: false,
      reason: `Team "${fixture.teamAName}" has fewer than 2 players in the roster. Update teams and re-seed.`,
    };
  }

  if (xiB.length < 2) {
    return {
      ok: false,
      reason: `Team "${fixture.teamBName}" has fewer than 2 players in the roster. Update teams and re-seed.`,
    };
  }

  return { ok: true };
}

export function formatLiveStartError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();

  if (lower.includes("missing or insufficient permissions") || lower.includes("permission-denied")) {
    return [
      "Firestore blocked starting the match (permissions).",
      "Fix: In Vercel env vars set ADMIN_EMAILS to your Google email and FIREBASE_SERVICE_ACCOUNT_JSON for this Firebase project.",
      "Then sign out, sign in again, and confirm Admin shows role administrator or scorer.",
      "Or in Firebase Console → Firestore → users → your uid → set role to administrator.",
    ].join(" ");
  }

  if (lower.includes("failed-precondition") || lower.includes("index")) {
    return [
      "Firestore index missing.",
      "Create the index from the link in the browser console error, or run: npm run firebase:deploy:rules",
      "Common indexes: innings (matchId + inningsNumber), balls (inningsId + sequence).",
    ].join(" ");
  }

  return message;
}
