import {
  doc,
  onSnapshot,
  runTransaction,
  type Unsubscribe,
} from "firebase/firestore";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase/config";
import type { Match, ScoringSession } from "@/types";

const LOCK_TTL_MS = 120_000;
const HEARTBEAT_MS = 30_000;

function lockRef(matchId: string) {
  return doc(getFirebaseDb(), "matches", matchId);
}

function isExpired(session: ScoringSession | undefined, now = Date.now()): boolean {
  if (!session?.expiresAt) return true;
  return new Date(session.expiresAt).getTime() <= now;
}

function buildSession(
  uid: string,
  email?: string,
  displayName?: string
): ScoringSession {
  const now = new Date();
  const expires = new Date(now.getTime() + LOCK_TTL_MS);
  return {
    uid,
    email,
    displayName,
    acquiredAt: now.toISOString(),
    heartbeatAt: now.toISOString(),
    expiresAt: expires.toISOString(),
  };
}

export async function acquireScoringLock(
  matchId: string,
  uid: string,
  email?: string,
  displayName?: string
): Promise<ScoringSession> {
  if (!isFirebaseConfigured()) {
    return buildSession(uid, email, displayName);
  }

  const ref = lockRef(matchId);
  const session = buildSession(uid, email, displayName);

  await runTransaction(getFirebaseDb(), async (tx) => {
    const snap = await tx.get(ref);
    const existing = snap.data()?.scoringSession as ScoringSession | undefined;
    if (existing && !isExpired(existing) && existing.uid !== uid) {
      throw new Error(
        `Match is being scored by ${existing.displayName ?? existing.email ?? "another operator"}.`
      );
    }
    tx.set(ref, { scoringSession: session, updatedAt: session.acquiredAt }, { merge: true });
  });

  return session;
}

export async function takeOverScoringLock(
  matchId: string,
  uid: string,
  email?: string,
  displayName?: string
): Promise<ScoringSession> {
  if (!isFirebaseConfigured()) {
    return buildSession(uid, email, displayName);
  }

  const ref = lockRef(matchId);
  const session = buildSession(uid, email, displayName);
  await runTransaction(getFirebaseDb(), async (tx) => {
    tx.set(ref, { scoringSession: session, updatedAt: session.acquiredAt }, { merge: true });
  });
  return session;
}

export async function heartbeatScoringLock(matchId: string, uid: string): Promise<void> {
  if (!isFirebaseConfigured()) return;

  const ref = lockRef(matchId);
  const now = new Date();
  const expires = new Date(now.getTime() + LOCK_TTL_MS);

  await runTransaction(getFirebaseDb(), async (tx) => {
    const snap = await tx.get(ref);
    const existing = snap.data()?.scoringSession as ScoringSession | undefined;
    if (!existing || existing.uid !== uid) return;
    tx.set(
      ref,
      {
        scoringSession: {
          ...existing,
          heartbeatAt: now.toISOString(),
          expiresAt: expires.toISOString(),
        },
        updatedAt: now.toISOString(),
      },
      { merge: true }
    );
  });
}

export async function releaseScoringLock(matchId: string, uid: string): Promise<void> {
  if (!isFirebaseConfigured()) return;

  const ref = lockRef(matchId);
  await runTransaction(getFirebaseDb(), async (tx) => {
    const snap = await tx.get(ref);
    const existing = snap.data()?.scoringSession as ScoringSession | undefined;
    if (!existing || existing.uid !== uid) return;
    tx.set(
      ref,
      { scoringSession: null, updatedAt: new Date().toISOString() },
      { merge: true }
    );
  });
}

export function subscribeScoringLock(
  matchId: string,
  onChange: (session: ScoringSession | null) => void
): Unsubscribe {
  if (!isFirebaseConfigured()) {
    onChange(null);
    return () => {};
  }

  return onSnapshot(lockRef(matchId), (snap) => {
    const session = snap.data()?.scoringSession as ScoringSession | undefined;
    if (!session || isExpired(session)) {
      onChange(null);
      return;
    }
    onChange(session);
  });
}

export function canScoreWithLock(
  session: ScoringSession | null,
  uid: string | undefined
): { ok: true } | { ok: false; holder?: ScoringSession } {
  if (!session || !uid) return { ok: true };
  if (session.uid === uid) return { ok: true };
  return { ok: false, holder: session };
}

export { HEARTBEAT_MS, LOCK_TTL_MS };
