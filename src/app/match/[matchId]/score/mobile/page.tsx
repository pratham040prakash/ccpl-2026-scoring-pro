"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { MobileScorer } from "@/components/scorer/mobile-scorer";
import { useLiveMatch } from "@/hooks/use-live-match";
import { useAuth } from "@/providers/auth-provider";
import { formatOvers } from "@/lib/utils";
import {
  applyScoringAction,
  undoLastBall,
  type ScoringContext,
} from "@/lib/engine/live-scoring-service";
import { resolveBattingBowlingXis } from "@/lib/live/resolve-playing-xis";
import { buildScoringUser } from "@/lib/live/scoring-user";
import { queueOfflineAction, isOnline } from "@/lib/offline/store";
import { syncPendingActions } from "@/lib/offline/sync";
import { generateId } from "@/lib/utils";
import { formatLiveStartError } from "@/lib/live/match-start";
import { scoreBall } from "@/lib/engine/scoring";
import { enrichInningsFromBalls, rotateStrike } from "@/lib/engine/innings-metrics";
import { logScoring } from "@/lib/live/scoring-logger";
import type { Ball, Innings, ScoringAction } from "@/types";

function pickInnings(live: Innings | undefined, local: Innings | null): Innings | null | undefined {
  if (!live && !local) return null;
  if (!live) return local;
  if (!local) return live;
  return (local.updatedAt ?? "") > (live.updatedAt ?? "") ? local : live;
}

export default function MobileScorerPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = use(params);
  const { user, profile } = useAuth();
  const live = useLiveMatch(matchId);
  const { fixture, match, currentInnings, balls: liveBalls } = live;
  const [offline, setOffline] = useState(false);
  const [busy, setBusy] = useState(false);
  const [scoreError, setScoreError] = useState<string | null>(null);
  const [bootstrappedInnings, setBootstrappedInnings] = useState<Innings | null>(null);
  const [pendingBalls, setPendingBalls] = useState<Ball[]>([]);

  const activeInnings = pickInnings(currentInnings, bootstrappedInnings);
  const balls = useMemo(() => {
    const byId = new Map<string, Ball>();
    for (const b of liveBalls) byId.set(b.id, b);
    for (const b of pendingBalls) byId.set(b.id, b);
    return Array.from(byId.values()).sort((a, b) => a.sequence - b.sequence);
  }, [liveBalls, pendingBalls]);

  useEffect(() => {
    setPendingBalls([]);
    setBootstrappedInnings(null);
  }, [activeInnings?.id]);

  useEffect(() => {
    const check = async () => setOffline(!(await isOnline()));
    const onOnline = async () => {
      setOffline(false);
      if (user) {
        const su = await buildScoringUser(user);
        await syncPendingActions(matchId, su, fixture ?? undefined);
        live.refresh();
      }
    };
    check();
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", check);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", check);
    };
  }, [matchId, user, fixture]);

  const getContext = useCallback((): ScoringContext | null => {
    if (!activeInnings?.strikerId || !activeInnings.nonStrikerId || !activeInnings.bowlerId) {
      return null;
    }
    const { battingXi, bowlingXi } = resolveBattingBowlingXis(fixture, match, activeInnings);
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
      if (!ctx) {
        setScoreError("Set striker, non-striker, and bowler before scoring.");
        return;
      }

      setBusy(true);
      setScoreError(null);
      try {
        if (offline) {
          const sequence = activeInnings.nextSequence ?? balls.length;
          const result = scoreBall({ match, innings: activeInnings, ...ctx, action, sequence });
          const updatedPartial = { ...activeInnings, ...result.updatedInnings };
          const allBalls = [...balls, result.ball];
          const metrics = enrichInningsFromBalls(updatedPartial, match, allBalls);
          const strike = rotateStrike(ctx.strikerId, ctx.nonStrikerId, result.rotateStrike);
          setBootstrappedInnings({
            ...updatedPartial,
            ...metrics,
            strikerId: strike.strikerId,
            nonStrikerId: strike.nonStrikerId,
            bowlerId: ctx.bowlerId,
            nextSequence: sequence + 1,
            updatedAt: new Date().toISOString(),
          });
          setPendingBalls((prev) => [...prev, result.ball]);
          await queueOfflineAction({
            id: generateId("pending"),
            matchId: match.id,
            inningsId: activeInnings.id,
            action,
            ...ctx,
            sequence,
            createdAt: new Date().toISOString(),
            synced: false,
          });
        } else {
          const su = await buildScoringUser(user);
          const result = await applyScoringAction(match, activeInnings, balls, action, ctx, su);
          setBootstrappedInnings(result.innings);
          setPendingBalls((prev) => [...prev, result.ball]);
          logScoring("score_submitted", "Mobile ball scored", { runs: result.ball.runs });
        }
      } catch (error) {
        setScoreError(formatLiveStartError(error));
      } finally {
        setBusy(false);
      }
    },
    [match, activeInnings, balls, busy, getContext, offline, user]
  );

  const handleUndo = useCallback(async () => {
    if (!match || !activeInnings || balls.length === 0 || busy) return;
    setBusy(true);
    setScoreError(null);
    try {
      const su = await buildScoringUser(user);
      const updated = await undoLastBall(match, activeInnings, balls, su);
      if (updated) {
        setBootstrappedInnings(updated);
        setPendingBalls([]);
      }
    } catch (error) {
      setScoreError(formatLiveStartError(error));
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
        {profile?.role === "viewer" && (
          <p className="text-amber-400 text-sm">Viewer access — cannot start matches.</p>
        )}
        {canScore && (
          <Link
            href={`/admin/matches/${fixture.id}/setup`}
            className="px-6 py-3 rounded-xl bg-emerald-600 text-white font-bold"
          >
            Match Setup Wizard
          </Link>
        )}
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
        {(scoreError || live.ballsError) && (
          <p className="text-amber-400 text-xs mt-2 text-center">{scoreError ?? live.ballsError}</p>
        )}
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
