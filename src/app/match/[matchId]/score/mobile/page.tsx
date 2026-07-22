"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { MobileScorer } from "@/components/scorer/mobile-scorer";
import { useLiveMatch } from "@/hooks/use-live-match";
import { useAuth } from "@/providers/auth-provider";
import { formatOvers } from "@/lib/utils";
import {
  applyScoringAction,
  type ScoringContext,
} from "@/lib/engine/live-scoring-service";
import { resolvePlayingXi } from "@/lib/live/player-roster";
import { queueOfflineAction, isOnline } from "@/lib/offline/store";
import { syncPendingActions } from "@/lib/offline/sync";
import { undoLastBall } from "@/lib/engine/live-scoring-service";
import { generateId } from "@/lib/utils";
import type { ScoringAction } from "@/types";

export default function MobileScorerPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = use(params);
  const { user } = useAuth();
  const live = useLiveMatch(matchId);
  const { fixture, match, currentInnings, balls } = live;
  const [offline, setOffline] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const check = async () => setOffline(!(await isOnline()));
    const onOnline = async () => {
      setOffline(false);
      if (user) {
        await syncPendingActions(matchId, { uid: user.uid, email: user.email ?? undefined });
      }
    };
    check();
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", check);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", check);
    };
  }, [matchId, user]);

  const getContext = useCallback((): ScoringContext | null => {
    if (!currentInnings?.strikerId || !currentInnings.nonStrikerId || !currentInnings.bowlerId) {
      return null;
    }
    const battingXi = resolvePlayingXi(currentInnings.teamName, match?.playingXiA);
    const bowlingName =
      currentInnings.teamId === fixture?.teamAId ? fixture?.teamBName : fixture?.teamAName;
    const bowlingXi = resolvePlayingXi(bowlingName ?? "", match?.playingXiB);

    const s = battingXi.find((p) => p.id === currentInnings.strikerId);
    const ns = battingXi.find((p) => p.id === currentInnings.nonStrikerId);
    const bw = bowlingXi.find((p) => p.id === currentInnings.bowlerId);
    if (!s || !ns || !bw) return null;

    return {
      strikerId: s.id,
      strikerName: s.name,
      nonStrikerId: ns.id,
      nonStrikerName: ns.name,
      bowlerId: bw.id,
      bowlerName: bw.name,
    };
  }, [currentInnings, match, fixture]);

  const handleScore = useCallback(
    async (action: ScoringAction) => {
      if (!match || !currentInnings || busy) return;
      const ctx = getContext();
      if (!ctx) return;

      setBusy(true);
      try {
        const userMeta = user ? { uid: user.uid, email: user.email ?? undefined } : undefined;
        if (offline) {
          await queueOfflineAction({
            id: generateId("pending"),
            matchId: match.id,
            inningsId: currentInnings.id,
            action,
            ...ctx,
            sequence: currentInnings.nextSequence ?? balls.length,
            createdAt: new Date().toISOString(),
            synced: false,
          });
        } else {
          await applyScoringAction(match, currentInnings, balls, action, ctx, userMeta);
        }
      } finally {
        setBusy(false);
      }
    },
    [match, currentInnings, balls, busy, getContext, offline, user]
  );

  const handleUndo = useCallback(async () => {
    if (!match || !currentInnings || balls.length === 0 || busy) return;
    setBusy(true);
    try {
      await undoLastBall(
        match,
        currentInnings,
        balls,
        user ? { uid: user.uid, email: user.email ?? undefined } : undefined
      );
    } finally {
      setBusy(false);
    }
  }, [match, currentInnings, balls, busy, user]);

  if (!fixture) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        Match not found
      </div>
    );
  }

  if (!currentInnings) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <p className="text-xl font-bold mb-2">Match not started</p>
        <p className="text-slate-400 mb-6">Start scoring from Admin → Match Control</p>
        <Link href={`/admin/matches/${fixture.id}/score`} className="text-accent">
          Open Admin Scorer
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <Link href={`/live/${fixture.id}`} className="p-2">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="text-center">
            <p className="text-xs text-slate-400">{fixture.matchId}</p>
            <p className="text-2xl font-black tabular-nums">
              {currentInnings.runs}/{currentInnings.wickets}
              <span className="text-sm font-normal text-slate-400 ml-2">
                ({formatOvers(currentInnings.overs, currentInnings.balls)})
              </span>
            </p>
          </div>
          <div className="text-right min-w-[60px]">
            {offline && (
              <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-1 rounded-full">
                Offline
              </span>
            )}
          </div>
        </div>
      </div>

      <MobileScorer
        onScore={handleScore}
        onUndo={handleUndo}
        disabled={busy || match.status === "paused"}
        currentOver={formatOvers(currentInnings.overs, currentInnings.balls)}
      />
    </div>
  );
}
