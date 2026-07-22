"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Pause,
  Play,
  RotateCcw,
  Undo2,
  History,
  ChevronDown,
} from "lucide-react";
import type { DismissalType, ScoringAction } from "@/types";
import { cn, formatOvers, strikeRate } from "@/lib/utils";
import { useLiveMatch } from "@/hooks/use-live-match";
import { useAuth } from "@/providers/auth-provider";
import {
  applyScoringAction,
  initializeLiveMatch,
  undoLastBall,
  restoreToOver,
  pauseMatch,
  resumeMatch,
  type ScoringContext,
} from "@/lib/engine/live-scoring-service";
import {
  ballsRemaining,
  isPowerplay,
  runsNeeded,
} from "@/lib/engine/innings-metrics";
import { resolvePlayingXi } from "@/lib/live/player-roster";
import { BallTimelineStrip } from "@/components/scoreboard/ball-timeline";
import { WicketFlow } from "@/components/scorer/wicket-flow";
import { aggregateBatterScores, aggregateBowlerScores } from "@/lib/engine/statistics";
import { queueOfflineAction, isOnline } from "@/lib/offline/store";
import { syncPendingActions } from "@/lib/offline/sync";
import { generateId } from "@/lib/utils";

const RUN_BUTTONS = [0, 1, 2, 3, 4, 5, 6];
const DISMISSALS: DismissalType[] = [
  "bowled",
  "caught",
  "lbw",
  "run_out",
  "stumped",
  "hit_wicket",
  "retired_hurt",
  "timed_out",
  "obstructing_field",
];

interface AdminLiveScorerProps {
  matchId: string;
}

export function AdminLiveScorer({ matchId }: AdminLiveScorerProps) {
  const { user, profile } = useAuth();
  const live = useLiveMatch(matchId);
  const [busy, setBusy] = useState(false);
  const [wicketMode, setWicketMode] = useState(false);
  const [extrasMode, setExtrasMode] = useState<"wide" | "no_ball" | "bye" | "leg_bye" | null>(null);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [restoreOver, setRestoreOver] = useState("0");
  const [restoreBall, setRestoreBall] = useState("0");
  const [offline, setOffline] = useState(false);
  const [started, setStarted] = useState(false);
  const [pendingDismissal, setPendingDismissal] = useState<DismissalType | null>(null);

  const fixture = live.fixture;
  const match = live.match;
  const innings = live.currentInnings;
  const balls = live.balls;

  useEffect(() => {
    const check = async () => setOffline(!(await isOnline()));
    check();
    window.addEventListener("online", async () => {
      setOffline(false);
      if (user) await syncPendingActions(matchId, { uid: user.uid, email: user.email ?? undefined });
    });
    window.addEventListener("offline", check);
    return () => {
      window.removeEventListener("online", check);
      window.removeEventListener("offline", check);
    };
  }, [matchId, user]);

  const battingXi = useMemo(() => {
    if (!fixture || !innings) return [];
    const isTeamA = innings.teamId === fixture.teamAId;
    return resolvePlayingXi(
      isTeamA ? fixture.teamAName : fixture.teamBName,
      isTeamA ? match?.playingXiA : match?.playingXiB
    );
  }, [fixture, innings, match?.playingXiA, match?.playingXiB]);

  const bowlingXi = useMemo(() => {
    if (!fixture || !innings) return [];
    const isTeamA = innings.teamId === fixture.teamAId;
    return resolvePlayingXi(
      isTeamA ? fixture.teamBName : fixture.teamAName,
      isTeamA ? match?.playingXiB : match?.playingXiA
    );
  }, [fixture, innings, match?.playingXiA, match?.playingXiB]);

  const batters = useMemo(() => aggregateBatterScores(balls), [balls]);
  const bowlers = useMemo(() => aggregateBowlerScores(balls), [balls]);

  const striker = batters.find((b) => b.playerId === innings?.strikerId);
  const nonStriker = batters.find((b) => b.playerId === innings?.nonStrikerId);
  const bowler = bowlers.find((b) => b.playerId === innings?.bowlerId) ?? bowlers[0];

  const ctx = useCallback((): ScoringContext | null => {
    if (!innings?.strikerId || !innings.nonStrikerId || !innings.bowlerId) return null;
    const s = battingXi.find((p) => p.id === innings.strikerId);
    const ns = battingXi.find((p) => p.id === innings.nonStrikerId);
    const bw = bowlingXi.find((p) => p.id === innings.bowlerId);
    if (!s || !ns || !bw) return null;
    return {
      strikerId: s.id,
      strikerName: s.name,
      nonStrikerId: ns.id,
      nonStrikerName: ns.name,
      bowlerId: bw.id,
      bowlerName: bw.name,
    };
  }, [innings, battingXi, bowlingXi]);

  const scoringUser = useCallback(async () => {
    if (!user) return undefined;
    const idToken = await user.getIdToken();
    return { uid: user.uid, email: user.email ?? undefined, idToken };
  }, [user]);

  const outBatterIds = useMemo(
    () => new Set(batters.filter((b) => b.isOut).map((b) => b.playerId)),
    [batters]
  );

  const handleStart = async () => {
    if (!fixture) return;
    setBusy(true);
    try {
      await initializeLiveMatch(fixture);
      setStarted(true);
      live.refresh();
    } finally {
      setBusy(false);
    }
  };

  const handleScore = async (action: ScoringAction) => {
    if (!match || !innings || busy) return;
    const context = ctx();
    if (!context) return;

    setBusy(true);
    try {
      if (offline) {
        await queueOfflineAction({
          id: generateId("pending"),
          matchId: match.id,
          inningsId: innings.id,
          action,
          ...context,
          sequence: innings.nextSequence ?? balls.length,
          createdAt: new Date().toISOString(),
          synced: false,
        });
      } else {
        const su = await scoringUser();
        await applyScoringAction(match, innings, balls, action, context, su);
      }
      setWicketMode(false);
      setExtrasMode(null);
    } finally {
      setBusy(false);
    }
  };

  const handleUndo = async () => {
    if (!match || !innings || balls.length === 0 || busy) return;
    setBusy(true);
    try {
      const su = await scoringUser();
      await undoLastBall(match, innings, balls, su);
    } finally {
      setBusy(false);
    }
  };

  const handleRestore = async () => {
    if (!match || !innings || busy) return;
    setBusy(true);
    try {
      const su = await scoringUser();
      await restoreToOver(
        match,
        innings,
        balls,
        parseInt(restoreOver, 10) || 0,
        parseInt(restoreBall, 10) || 0,
        su
      );
      setRestoreOpen(false);
    } finally {
      setBusy(false);
    }
  };

  if (!fixture) {
    return <p className="text-slate-500 p-8">Match not found</p>;
  }

  if (!innings && !started && live.innings.length === 0) {
    return (
      <div className="glass-card p-10 text-center max-w-lg mx-auto">
        <h2 className="text-xl font-black mb-2">Start Live Scoring</h2>
        <p className="text-slate-500 mb-6">
          {fixture.teamAName} vs {fixture.teamBName} · {fixture.overs} overs
        </p>
        <button
          onClick={handleStart}
          disabled={busy || profile?.role === "viewer"}
          className="px-8 py-4 rounded-xl bg-emerald-600 text-white font-bold disabled:opacity-50"
        >
          {busy ? "Starting…" : "Start Match & Open Scorer"}
        </button>
      </div>
    );
  }

  if (!innings) {
    return <p className="text-slate-500 p-8">Loading live match…</p>;
  }

  if (match.status === "completed" && match.result) {
    return (
      <div className="glass-card p-10 text-center max-w-lg mx-auto space-y-4">
        <h2 className="text-2xl font-black text-emerald-600">Match Complete</h2>
        <p className="text-lg font-bold">{match.result.summary}</p>
        <p className="text-sm text-slate-500">
          Standings and leaderboards updated automatically.
        </p>
      </div>
    );
  }

  const need = match.target ? runsNeeded(match, innings) : undefined;
  const ballsLeft = ballsRemaining(match, innings);

  return (
    <div className="space-y-4 pb-32">
      {/* Header strip */}
      <div className="glass-card p-4 gradient-hero text-white">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="live-badge">LIVE</span>
              {match.status === "paused" && (
                <span className="text-xs bg-amber-500/30 px-2 py-0.5 rounded-full">PAUSED</span>
              )}
              {offline && (
                <span className="text-xs bg-amber-500/30 px-2 py-0.5 rounded-full">Offline queue</span>
              )}
            </div>
            <p className="text-sm opacity-80">{fixture.matchId} · {innings.teamName}</p>
            <p className="text-4xl font-black tabular-nums mt-1">
              {innings.runs}/{innings.wickets}
              <span className="text-lg font-normal ml-2 opacity-80">
                ({formatOvers(innings.overs, innings.balls)})
              </span>
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1 text-sm">
            <span>CRR: {innings.runRate.toFixed(2)}</span>
            {innings.requiredRunRate != null && (
              <span>RRR: {innings.requiredRunRate.toFixed(2)}</span>
            )}
            {match.target && <span>Target: {match.target}</span>}
            {need != null && <span>Need: {need} off {ballsLeft}</span>}
            {innings.projectedScore != null && (
              <span>Proj: {Math.round(innings.projectedScore)}</span>
            )}
            {isPowerplay(innings) && <span className="text-amber-300">Powerplay</span>}
            {innings.partnership && (
              <span>P&apos;ship: {innings.partnership.runs} ({innings.partnership.balls})</span>
            )}
          </div>
        </div>
      </div>

      {/* Batters & bowler */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="glass-card p-4">
          <h4 className="text-xs uppercase tracking-wider text-slate-500 mb-3">Batters</h4>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-500 text-left">
                <th>Player</th>
                <th>R</th>
                <th>B</th>
                <th>4s</th>
                <th>6s</th>
                <th>SR</th>
              </tr>
            </thead>
            <tbody>
              {[striker, nonStriker].filter(Boolean).map((b) => (
                <tr key={b!.playerId} className="border-t border-slate-200/10">
                  <td className="py-2 font-medium">
                    {b!.playerName}
                    {b!.playerId === innings.strikerId ? "*" : ""}
                  </td>
                  <td>{b!.runs}</td>
                  <td>{b!.balls}</td>
                  <td>{b!.fours}</td>
                  <td>{b!.sixes}</td>
                  <td>{strikeRate(b!.runs, b!.balls)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-3 flex gap-2 flex-wrap">
            {battingXi.slice(0, 6).map((p) => (
              <button
                key={p.id}
                type="button"
                className="text-xs px-2 py-1 rounded bg-slate-800 text-white"
                onClick={() => {}}
              >
                {p.name.split(" ")[0]}
              </button>
            ))}
          </div>
        </div>

        <div className="glass-card p-4">
          <h4 className="text-xs uppercase tracking-wider text-slate-500 mb-3">Bowler</h4>
          {bowler && (
            <p className="text-lg font-bold">
              {bowler.playerName}{" "}
              <span className="font-mono text-slate-500 text-base">
                {Math.floor(bowler.balls / 6)}.{bowler.balls % 6}-{bowler.runs}-{bowler.wickets}
              </span>
            </p>
          )}
          <BallTimelineStrip balls={balls} />
        </div>
      </div>

      {/* Scoring buttons */}
      {!wicketMode && !extrasMode && (
        <>
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
            {RUN_BUTTONS.map((runs) => (
              <motion.button
                key={runs}
                whileTap={{ scale: 0.92 }}
                disabled={busy || match.status === "paused"}
                onClick={() =>
                  handleScore(runs === 0 ? { type: "dot" } : { type: "runs", runs })
                }
                className={cn(
                  "min-h-[56px] h-16 sm:h-20 rounded-2xl text-2xl font-black disabled:opacity-40",
                  runs === 0 ? "bg-slate-700 text-white" :
                  runs === 4 ? "bg-blue-600 text-white" :
                  runs === 6 ? "bg-purple-600 text-white" :
                  "bg-emerald-600 text-white"
                )}
              >
                {runs === 0 ? "·" : runs}
              </motion.button>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(["wide", "no_ball", "bye", "leg_bye"] as const).map((ex) => (
              <button
                key={ex}
                type="button"
                disabled={busy}
                onClick={() => setExtrasMode(ex)}
                className="min-h-[56px] h-14 rounded-xl bg-amber-600/90 text-white font-bold capitalize"
              >
                {ex.replace("_", " ")}
              </button>
            ))}
            <button
              type="button"
              disabled={busy}
              onClick={() => handleScore({ type: "penalty", runs: 5 })}
              className="h-14 rounded-xl bg-orange-700 text-white font-bold"
            >
              Penalty
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setWicketMode(true)}
              className="h-14 rounded-xl bg-red-600 text-white font-black"
            >
              Wicket
            </button>
          </div>
        </>
      )}

      {extrasMode && (
        <div className="glass-card p-4 space-y-2">
          <button type="button" onClick={() => setExtrasMode(null)} className="text-sm text-slate-500 flex items-center gap-1">
            <RotateCcw className="w-4 h-4" /> Back
          </button>
          <p className="font-bold capitalize">{extrasMode.replace("_", " ")} — select runs</p>
          <div className="grid grid-cols-4 gap-2">
            {[0, 1, 2, 3, 4, 5, 6].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => {
                  if (extrasMode === "wide") handleScore({ type: "wide", runs: r });
                  else if (extrasMode === "no_ball") handleScore({ type: "no_ball", runs: r });
                  else if (extrasMode === "bye") handleScore({ type: "bye", runs: r || 1 });
                  else handleScore({ type: "leg_bye", runs: r || 1 });
                }}
                className="h-14 rounded-xl bg-amber-600 text-white font-bold"
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      )}

      {wicketMode && (
        <div className="glass-card p-4 space-y-2">
          <button type="button" onClick={() => setWicketMode(false)} className="text-sm text-slate-500 flex items-center gap-1">
            <RotateCcw className="w-4 h-4" /> Back
          </button>
          {DISMISSALS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setPendingDismissal(d)}
              className="w-full h-14 rounded-xl bg-red-700 text-white font-bold capitalize"
            >
              {d.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      )}

      <WicketFlow
        open={Boolean(pendingDismissal)}
        dismissal={pendingDismissal}
        battingXi={battingXi}
        bowlingXi={bowlingXi}
        strikerId={innings.strikerId ?? ""}
        nonStrikerId={innings.nonStrikerId ?? ""}
        outBatterIds={outBatterIds}
        onCancel={() => {
          setPendingDismissal(null);
          setWicketMode(false);
        }}
        onConfirm={(payload) => {
          handleScore({
            type: "wicket",
            dismissal: payload.dismissal,
            dismissedPlayerId: payload.dismissedPlayerId,
            fielderId: payload.fielderId,
            newBatterId: payload.newBatterId,
          });
          setPendingDismissal(null);
        }}
      />

      {/* Admin controls */}
      <div className="glass-card p-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={handleUndo}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 text-white text-sm"
        >
          <Undo2 className="w-4 h-4" /> Undo
        </button>
        <button
          type="button"
          onClick={() =>
            match.status === "paused" ? resumeMatch(match.id) : pauseMatch(match.id)
          }
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700 text-white text-sm"
        >
          {match.status === "paused" ? (
            <><Play className="w-4 h-4" /> Resume</>
          ) : (
            <><Pause className="w-4 h-4" /> Pause</>
          )}
        </button>
        <button
          type="button"
          onClick={() => setRestoreOpen(!restoreOpen)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-800 text-white text-sm"
        >
          <History className="w-4 h-4" /> Restore
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      {restoreOpen && (
        <div className="glass-card p-4 flex flex-wrap items-end gap-3">
          <label className="text-sm">
            Over
            <input
              value={restoreOver}
              onChange={(e) => setRestoreOver(e.target.value)}
              className="block mt-1 px-3 py-2 rounded-lg bg-slate-900 text-white w-20"
            />
          </label>
          <label className="text-sm">
            Ball
            <input
              value={restoreBall}
              onChange={(e) => setRestoreBall(e.target.value)}
              className="block mt-1 px-3 py-2 rounded-lg bg-slate-900 text-white w-20"
            />
          </label>
          <button
            type="button"
            onClick={handleRestore}
            disabled={busy}
            className="px-4 py-2 rounded-lg bg-purple-600 text-white font-bold"
          >
            Restore to {restoreOver}.{restoreBall}
          </button>
        </div>
      )}
    </div>
  );
}
