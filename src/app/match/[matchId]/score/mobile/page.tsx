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
  initializeLiveMatch,
  type ScoringContext,
} from "@/lib/engine/live-scoring-service";
import { resolvePlayingXi } from "@/lib/live/player-roster";
import { queueOfflineAction, isOnline } from "@/lib/offline/store";
import { syncPendingActions } from "@/lib/offline/sync";
import { undoLastBall } from "@/lib/engine/live-scoring-service";
import { generateId } from "@/lib/utils";
import { formatLiveStartError } from "@/lib/live/match-start";
import type { Innings, ScoringAction } from "@/types";

export default function MobileScorerPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = use(params);
  const { user, profile } = useAuth();
  const live = useLiveMatch(matchId);
  const { fixture, match, currentInnings, balls } = live;
  const [offline, setOffline] = useState(false);
  const [busy, setBusy] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [bootstrappedInnings, setBootstrappedInnings] = useState<Innings | null>(null);

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

  const activeInnings = bootstrappedInnings ?? currentInnings;

  const handleStart = async () => {
    if (!fixture) return;
    setBusy(true);
    setStartError(null);
    try {
      const result = await initializeLiveMatch(fixture);
      setBootstrappedInnings(result.innings);
      live.refresh();
    } catch (error) {
      setStartError(formatLiveStartError(error));
    } finally {
      setBusy(false);
    }
  };

  const getContext = useCallback((): ScoringContext | null => {
    if (!activeInnings?.strikerId || !activeInnings.nonStrikerId || !activeInnings.bowlerId) {
      return null;
    }
    const battingXi = resolvePlayingXi(activeInnings.teamName, match?.playingXiA);
    const bowlingName =
      activeInnings.teamId === fixture?.teamAId ? fixture?.teamBName : fixture?.teamAName;
    const bowlingXi = resolvePlayingXi(bowlingName ?? "", match?.playingXiB);

    const s = battingXi.find((p) => p.id === activeInnings.strikerId);
    const ns = battingXi.find((p) => p.id === activeInnings.nonStrikerId);
    const bw = bowlingXi.find((p) => p.id === activeInnings.bowlerId);
    if (!s || !ns || !bw) return null;

    return {
      strikerId: s.id,
      strikerName: s.name,
      nonStrikerId: ns.id,
      nonStrikerName: ns.name,
      bowlerId: bw.id,
      bowlerName: bw.name,
    };
  }, [activeInnings, match, fixture]);

  const handleScore = useCallback(
    async (action: ScoringAction) => {
      if (!match || !activeInnings || busy) return;
      const ctx = getContext();
      if (!ctx) return;

      setBusy(true);
      try {
        const userMeta = user ? { uid: user.uid, email: user.email ?? undefined } : undefined;
        if (offline) {
          await queueOfflineAction({
            id: generateId("pending"),
            matchId: match.id,
            inningsId: activeInnings.id,
            action,
            ...ctx,
            sequence: activeInnings.nextSequence ?? balls.length,
            createdAt: new Date().toISOString(),
            synced: false,
          });
        } else {
          await applyScoringAction(match, activeInnings, balls, action, ctx, userMeta);
        }
      } finally {
        setBusy(false);
      }
    },
    [match, activeInnings, balls, busy, getContext, offline, user]
  );

  const handleUndo = useCallback(async () => {
    if (!match || !activeInnings || balls.length === 0 || busy) return;
    setBusy(true);
    try {
      await undoLastBall(
        match,
        activeInnings,
        balls,
        user ? { uid: user.uid, email: user.email ?? undefined } : undefined
      );
    } finally {
      setBusy(false);
    }
  }, [match, activeInnings, balls, busy, user]);

  if (!fixture) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        Match not found
      </div>
    );
  }

  if (!activeInnings) {
    const canScore = profile?.role === "administrator" || profile?.role === "scorer";
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center gap-4">
        <p className="text-xl font-bold">Match not started</p>
        <p className="text-slate-400">
          {fixture.teamAName} vs {fixture.teamBName}
        </p>
        {startError && <p className="text-red-400 text-sm whitespace-pre-wrap">{startError}</p>}
        {profile?.role === "viewer" && (
          <p className="text-amber-400 text-sm">Viewer access — cannot start matches.</p>
        )}
        <button
          type="button"
          onClick={handleStart}
          disabled={busy || !canScore}
          className="px-6 py-3 rounded-xl bg-emerald-600 text-white font-bold disabled:opacity-50"
        >
          {busy ? "Starting…" : "Start Match"}
        </button>
        <Link href={`/admin/matches/${fixture.id}/score`} className="text-accent text-sm">
          Or open Admin Live Scorer
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
              {activeInnings.runs}/{activeInnings.wickets}
              <span className="text-sm font-normal text-slate-400 ml-2">
                ({formatOvers(activeInnings.overs, activeInnings.balls)})
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
        currentOver={formatOvers(activeInnings.overs, activeInnings.balls)}
      />
    </div>
  );
}
