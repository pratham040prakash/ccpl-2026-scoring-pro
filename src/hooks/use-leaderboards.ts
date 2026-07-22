"use client";

import { useEffect, useState } from "react";
import type { LeaderboardEntry } from "@/types";
import { subscribeToLeaderboards } from "@/lib/firebase/firestore";
import { calculateLeaderboards } from "@/lib/engine/statistics";
import { DEMO_DATA } from "@/lib/seed";

export type LeaderboardMap = Record<string, LeaderboardEntry[]>;

export function useLeaderboards() {
  const [boards, setBoards] = useState<LeaderboardMap>({});
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<"firestore" | "demo">("demo");

  useEffect(() => {
    const unsub = subscribeToLeaderboards((data) => {
      if (Object.keys(data).length > 0) {
        setBoards(data);
        setSource("firestore");
        setLoading(false);
      } else {
        const players = DEMO_DATA.players.map((p) => ({
          ...p.stats,
          playerId: p.id,
          playerName: p.name,
          teamId: p.teamId,
          teamName: DEMO_DATA.teams.find((t) => t.id === p.teamId)?.name || "",
        }));
        setBoards(calculateLeaderboards(players));
        setSource("demo");
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  return { boards, loading, source };
}
