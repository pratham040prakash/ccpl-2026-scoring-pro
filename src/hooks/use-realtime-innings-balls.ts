"use client";

import { useEffect, useMemo, useState } from "react";
import type { Ball, Innings } from "@/types";
import { subscribeToBalls } from "@/lib/firebase/firestore";
import { isFirebaseConfigured } from "@/lib/firebase/config";

/**
 * Realtime Firestore listeners for every innings in a match.
 * Merges live updates without page refresh.
 */
export function useRealtimeInningsBalls(innings: Innings[]): Record<string, Ball[]> {
  const [ballsByInnings, setBallsByInnings] = useState<Record<string, Ball[]>>({});
  const inningsKey = innings.map((i) => i.id).join("|");

  useEffect(() => {
    if (!innings.length) {
      setBallsByInnings({});
      return;
    }

    if (!isFirebaseConfigured()) {
      setBallsByInnings({});
      return;
    }

    const unsubs = innings.map((inn) =>
      subscribeToBalls(inn.id, (balls) => {
        setBallsByInnings((prev) => ({ ...prev, [inn.id]: balls }));
      })
    );

    return () => unsubs.forEach((u) => u());
  }, [inningsKey, innings]);

  return ballsByInnings;
}
