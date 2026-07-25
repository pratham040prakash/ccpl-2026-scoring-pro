"use client";

import { useEffect, useState } from "react";
import type { ScoringSession } from "@/types";
import {
  HEARTBEAT_MS,
  acquireScoringLock,
  heartbeatScoringLock,
  releaseScoringLock,
  subscribeScoringLock,
  takeOverScoringLock,
  canScoreWithLock,
} from "@/lib/live/scoring-lock";

export function useScoringLock(
  matchId: string | undefined,
  uid: string | undefined,
  displayName?: string,
  email?: string
) {
  const [session, setSession] = useState<ScoringSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!matchId) return;
    return subscribeScoringLock(matchId, setSession);
  }, [matchId]);

  useEffect(() => {
    if (!matchId || !uid) return;
    let cancelled = false;

    acquireScoringLock(matchId, uid, email, displayName)
      .then(() => {
        if (!cancelled) setError(null);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      });

    const timer = window.setInterval(() => {
      void heartbeatScoringLock(matchId, uid);
    }, HEARTBEAT_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      void releaseScoringLock(matchId, uid);
    };
  }, [matchId, uid, email, displayName]);

  const gate = canScoreWithLock(session, uid);

  const takeOver = async () => {
    if (!matchId || !uid) return;
    await takeOverScoringLock(matchId, uid, email, displayName);
    setError(null);
  };

  return {
    session,
    readOnly: !gate.ok,
    holder: gate.ok ? null : gate.holder,
    error,
    takeOver,
  };
}
