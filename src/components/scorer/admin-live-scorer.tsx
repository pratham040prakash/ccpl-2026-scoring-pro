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
import type { DismissalType, Innings, Match, ScoringAction, BatterScore, BowlerScore, Ball } from "@/types";
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
  updateInningsParticipants,
  type ScoringContext,
} from "@/lib/engine/live-scoring-service";
import { scoreBall } from "@/lib/engine/scoring";
import {
  ballsRemaining,
  isPowerplay,
  runsNeeded,
  enrichInningsFromBalls,
  rotateStrike,
} from "@/lib/engine/innings-metrics";
import { type RosterPlayer } from "@/lib/live/player-roster";
import { resolveBattingBowlingXis } from "@/lib/live/resolve-playing-xis";
import { buildScoringUser } from "@/lib/live/scoring-user";
import { logScoring } from "@/lib/live/scoring-logger";
import { ScoringDebugPanel } from "@/components/scorer/scoring-debug-panel";
import { BallTimelineStrip } from "@/components/scoreboard/ball-timeline";
import { WicketFlow } from "@/components/scorer/wicket-flow";
import { aggregateBatterScores, aggregateBowlerScores } from "@/lib/engine/statistics";
import { queueOfflineAction, isOnline } from "@/lib/offline/store";
import { syncPendingActions } from "@/lib/offline/sync";
import { generateId } from "@/lib/utils";
import { canStartLiveScoring, formatLiveStartError } from "@/lib/live/match-start";

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

function pickInnings(live: Innings | undefined, local: Innings | null): Innings | null | undefined {
  if (!live && !local) return null;
  if (!live) return local;
  if (!local) return live;

  const liveReady = Boolean(live.strikerId && live.nonStrikerId && live.bowlerId);
  const localReady = Boolean(local.strikerId && local.nonStrikerId && local.bowlerId);
  if (localReady && !liveReady) return local;
  if (liveReady && !localReady) return live;

  return (local.updatedAt ?? "") > (live.updatedAt ?? "") ? local : live;
}

function pickMatch(live: Match | null, local: Match | null): Match | null {
  if (!live && !local) return null;
  if (!live) return local;
  if (!local) return live;
  return (local.updatedAt ?? "") > (live.updatedAt ?? "") ? local : live;
}

function mergeBallLists(remote: Ball[], pending: Ball[]): Ball[] {
  if (pending.length === 0) return remote;
  const byId = new Map<string, Ball>();
  for (const ball of remote) byId.set(ball.id, ball);
  for (const ball of pending) byId.set(ball.id, ball);
  return Array.from(byId.values()).sort((a, b) => a.sequence - b.sequence);
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
  const [startError, setStartError] = useState<string | null>(null);
  const [bootstrappedMatch, setBootstrappedMatch] = useState<Match | null>(null);
  const [bootstrappedInnings, setBootstrappedInnings] = useState<Innings | null>(null);
  const [pendingDismissal, setPendingDismissal] = useState<DismissalType | null>(null);
  const [pickRole, setPickRole] = useState<"striker" | "non_striker" | "bowler" | null>(null);
  const [participantError, setParticipantError] = useState<string | null>(null);
  const [participantsSynced, setParticipantsSynced] = useState(false);
  const [pendingBalls, setPendingBalls] = useState<Ball[]>([]);

  const fixture = live.fixture;
  const match = pickMatch(live.match, bootstrappedMatch);
  const innings = pickInnings(live.currentInnings, bootstrappedInnings);
  const balls = useMemo(
    () => mergeBallLists(live.balls, pendingBalls),
    [live.balls, pendingBalls]
  );

  useEffect(() => {
    setParticipantsSynced(false);
    setPickRole(null);
    setParticipantError(null);
    setPendingBalls([]);
  }, [innings?.id]);

  useEffect(() => {
    if (pendingBalls.length === 0) return;
    const remoteIds = new Set(live.balls.map((ball) => ball.id));
    if (pendingBalls.every((ball) => remoteIds.has(ball.id))) {
      setPendingBalls([]);
    }
  }, [live.balls, pendingBalls]);

  useEffect(() => {
    const check = async () => setOffline(!(await isOnline()));
    const onOnline = async () => {
      setOffline(false);
      if (user) {
        const su = await buildScoringUser(user);
        await syncPendingActions(matchId, su, fixture ?? undefined);
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

  const battingXi = useMemo(() => {
    return resolveBattingBowlingXis(fixture, match, innings).battingXi;
  }, [fixture, innings, match?.playingXiA, match?.playingXiB]);

  const bowlingXi = useMemo(() => {
    return resolveBattingBowlingXis(fixture, match, innings).bowlingXi;
  }, [fixture, innings, match?.playingXiA, match?.playingXiB]);

  const batters = useMemo(() => aggregateBatterScores(balls), [balls]);
  const bowlers = useMemo(() => aggregateBowlerScores(balls), [balls]);

  const buildBatterDisplay = useCallback(
    (playerId: string | undefined): BatterScore | null => {
      if (!playerId) return null;
      const fromStats = batters.find((b) => b.playerId === playerId);
      if (fromStats) return fromStats;
      const player = battingXi.find((p) => p.id === playerId);
      if (!player) return null;
      return {
        playerId: player.id,
        playerName: player.name,
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        strikeRate: 0,
        isOut: false,
      };
    },
    [batters, battingXi]
  );

  const buildBowlerDisplay = useCallback(
    (playerId: string | undefined): BowlerScore | null => {
      if (!playerId) return null;
      const fromStats = bowlers.find((b) => b.playerId === playerId);
      if (fromStats) return fromStats;
      const player = bowlingXi.find((p) => p.id === playerId);
      if (!player) return null;
      return {
        playerId: player.id,
        playerName: player.name,
        overs: 0,
        balls: 0,
        maidens: 0,
        runs: 0,
        wickets: 0,
        economy: 0,
      };
    },
    [bowlers, bowlingXi]
  );

  const striker = buildBatterDisplay(innings?.strikerId);
  const nonStriker = buildBatterDisplay(innings?.nonStrikerId);
  const bowler = buildBowlerDisplay(innings?.bowlerId);

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

  const scoringBlockedReason = useMemo(() => {
    if (!innings) return null;
    if (!innings.strikerId || !innings.nonStrikerId || !innings.bowlerId) {
      return "Set striker, non-striker, and bowler before scoring.";
    }
    if (!battingXi.find((p) => p.id === innings.strikerId)) {
      return "Striker is not in the batting XI. Tap a batter below to set striker.";
    }
    if (!battingXi.find((p) => p.id === innings.nonStrikerId)) {
      return "Non-striker is not in the batting XI. Tap a batter below to set non-striker.";
    }
    if (!bowlingXi.find((p) => p.id === innings.bowlerId)) {
      return "Bowler is not in the bowling XI. Tap a bowler below to set bowler.";
    }
    return null;
  }, [innings, battingXi, bowlingXi]);

  const scoringUser = useCallback(async () => buildScoringUser(user), [user]);

  const outBatterIds = useMemo(
    () => new Set(batters.filter((b) => b.isOut).map((b) => b.playerId)),
    [batters]
  );

  const startGate = fixture ? canStartLiveScoring(fixture) : { ok: false as const, reason: "Match not found" };

  useEffect(() => {
    if (!innings || participantsSynced || busy) return;
    if (!battingXi.length || !bowlingXi.length) return;
    if (innings.strikerId && innings.nonStrikerId && innings.bowlerId) {
      setParticipantsSynced(true);
      return;
    }

    const updates = {
      strikerId: innings.strikerId ?? battingXi[0]?.id,
      nonStrikerId: innings.nonStrikerId ?? battingXi[1]?.id ?? battingXi[0]?.id,
      bowlerId: innings.bowlerId ?? bowlingXi[0]?.id,
    };

    if (!updates.strikerId || !updates.nonStrikerId || !updates.bowlerId) return;

    setBusy(true);
    updateInningsParticipants(innings, updates)
      .then((updated) => {
        setBootstrappedInnings(updated);
        setParticipantsSynced(true);
        setParticipantError(null);
      })
      .catch((error) => {
        setParticipantError(formatLiveStartError(error));
      })
      .finally(() => setBusy(false));
  }, [innings, battingXi, bowlingXi, participantsSynced, busy]);

  const handleSetParticipant = async (
    role: "striker" | "non_striker" | "bowler",
    player: RosterPlayer
  ) => {
    if (!innings || busy) return;
    setBusy(true);
    setParticipantError(null);
    try {
      const updates =
        role === "striker"
          ? { strikerId: player.id }
          : role === "non_striker"
            ? { nonStrikerId: player.id }
            : { bowlerId: player.id };
      const updated = await updateInningsParticipants(innings, updates);
      setBootstrappedInnings(updated);
      setPickRole(null);
    } catch (error) {
      setParticipantError(formatLiveStartError(error));
    } finally {
      setBusy(false);
    }
  };

  const handlePlayerPick = (player: RosterPlayer, team: "batting" | "bowling") => {
    if (team === "bowling") {
      void handleSetParticipant("bowler", player);
      return;
    }
    if (pickRole === "striker") {
      void handleSetParticipant("striker", player);
    } else if (pickRole === "non_striker") {
      void handleSetParticipant("non_striker", player);
    } else {
      setPickRole("striker");
      void handleSetParticipant("striker", player);
    }
  };

  const handleStart = async () => {
    if (!fixture) return;
    if (!startGate.ok) {
      setStartError(startGate.reason);
      return;
    }
    setBusy(true);
    setStartError(null);
    try {
      const result = await initializeLiveMatch(fixture);
      setBootstrappedMatch(result.match);
      setBootstrappedInnings(result.innings);
      setStarted(true);
      live.refresh();
    } catch (error) {
      setStarted(false);
      setStartError(formatLiveStartError(error));
    } finally {
      setBusy(false);
    }
  };

  const handleScore = async (action: ScoringAction) => {
    if (!match || !innings || busy) return;
    const context = ctx();
    if (!context) {
      setParticipantError(scoringBlockedReason ?? "Set striker, non-striker, and bowler before scoring.");
      return;
    }

    setBusy(true);
    setParticipantError(null);
    try {
      if (offline) {
        const sequence = innings.nextSequence ?? balls.length;
        const result = scoreBall({
          match,
          innings,
          ...context,
          action,
          sequence,
        });
        const updatedPartial = { ...innings, ...result.updatedInnings };
        const allBalls = [...balls, result.ball];
        const metrics = enrichInningsFromBalls(updatedPartial, match, allBalls);
        const strike = rotateStrike(context.strikerId, context.nonStrikerId, result.rotateStrike);
        const preview: Innings = {
          ...updatedPartial,
          ...metrics,
          strikerId: strike.strikerId,
          nonStrikerId: strike.nonStrikerId,
          bowlerId: context.bowlerId,
          nextSequence: sequence + 1,
          updatedAt: new Date().toISOString(),
        };
        setBootstrappedInnings(preview);
        setPendingBalls((prev) => [...prev, result.ball]);
        await queueOfflineAction({
          id: generateId("pending"),
          matchId: match.id,
          inningsId: innings.id,
          action,
          ...context,
          sequence,
          createdAt: new Date().toISOString(),
          synced: false,
        });
        logScoring("score_submitted", "Queued offline (local preview applied)", { sequence });
      } else {
        const su = await scoringUser();
        const result = await applyScoringAction(match, innings, balls, action, context, su);
        setBootstrappedInnings(result.innings);
        setPendingBalls((prev) => [...prev, result.ball]);
        logScoring("score_submitted", "Ball applied online", { runs: result.ball.runs });
      }
      setWicketMode(false);
      setExtrasMode(null);
    } catch (error) {
      setParticipantError(formatLiveStartError(error));
    } finally {
      setBusy(false);
    }
  };

  const handleUndo = async () => {
    if (!match || !innings || balls.length === 0 || busy) return;
    setBusy(true);
    setParticipantError(null);
    try {
      const su = await scoringUser();
      const updated = await undoLastBall(match, innings, balls, su);
      if (updated) {
        setBootstrappedInnings(updated);
        setPendingBalls([]);
      }
    } catch (error) {
      setParticipantError(formatLiveStartError(error));
    } finally {
      setBusy(false);
    }
  };

  const handleRestore = async () => {
    if (!match || !innings || busy) return;
    setBusy(true);
    setParticipantError(null);
    try {
      const su = await scoringUser();
      const updated = await restoreToOver(
        match,
        innings,
        balls,
        parseInt(restoreOver, 10) || 0,
        parseInt(restoreBall, 10) || 0,
        su
      );
      setBootstrappedInnings(updated);
      setPendingBalls([]);
      setRestoreOpen(false);
      logScoring("restore", `Restored to ${restoreOver}.${restoreBall}`, { inningsId: innings.id });
    } catch (error) {
      setParticipantError(formatLiveStartError(error));
    } finally {
      setBusy(false);
    }
  };

  if (!fixture) {
    return <p className="text-slate-500 p-8">Match not found</p>;
  }

  if (!innings && !started && live.innings.length === 0) {
    return (
      <div className="glass-card p-10 text-center max-w-lg mx-auto space-y-4">
        <h2 className="text-xl font-black mb-2">Start Live Scoring</h2>
        <p className="text-slate-500 mb-6">
          {fixture.teamAName} vs {fixture.teamBName} · {fixture.overs} overs
        </p>
        {profile?.role === "viewer" && (
          <p className="text-amber-600 text-sm">
            Your account has viewer access only. Ask an admin to grant scorer or administrator role.
          </p>
        )}
        {!startGate.ok && (
          <p className="text-amber-600 text-sm">{startGate.reason}</p>
        )}
        {startError && (
          <p className="text-red-500 text-sm whitespace-pre-wrap">{startError}</p>
        )}
        {live.error && !startError && (
          <p className="text-red-500 text-sm whitespace-pre-wrap">{live.error}</p>
        )}
        <button
          onClick={handleStart}
          disabled={busy || profile?.role === "viewer" || !startGate.ok}
          className="px-8 py-4 rounded-xl bg-emerald-600 text-white font-bold disabled:opacity-50"
        >
          {busy ? "Starting…" : "Start Match & Open Scorer"}
        </button>
      </div>
    );
  }

  if (!match || !innings) {
    return (
      <div className="glass-card p-10 text-center max-w-lg mx-auto space-y-3">
        <p className="text-slate-500">Loading live match…</p>
        {(startError || live.error) && (
          <p className="text-red-500 text-sm whitespace-pre-wrap">{startError || live.error}</p>
        )}
        <button
          type="button"
          onClick={() => {
            setStarted(false);
            setBootstrappedMatch(null);
            setBootstrappedInnings(null);
            setStartError(null);
            live.refresh();
          }}
          className="text-sm text-primary underline"
        >
          Back to start
        </button>
      </div>
    );
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

      {(participantError || scoringBlockedReason || live.ballsError) && (
        <div className="glass-card p-3 border border-amber-500/40 bg-amber-500/10 text-amber-100 text-sm">
          {participantError ?? live.ballsError ?? scoringBlockedReason}
        </div>
      )}

      {/* Batters & bowler */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="glass-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h4 className="text-xs uppercase tracking-wider text-slate-500">Batters</h4>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setPickRole(pickRole === "striker" ? null : "striker")}
                className={cn(
                  "text-xs px-2 py-1 rounded font-semibold",
                  pickRole === "striker" ? "bg-emerald-500 text-white" : "bg-slate-800 text-white"
                )}
              >
                Set Striker
              </button>
              <button
                type="button"
                onClick={() => setPickRole(pickRole === "non_striker" ? null : "non_striker")}
                className={cn(
                  "text-xs px-2 py-1 rounded font-semibold",
                  pickRole === "non_striker" ? "bg-emerald-500 text-white" : "bg-slate-800 text-white"
                )}
              >
                Set Non-Striker
              </button>
            </div>
          </div>
          {pickRole && pickRole !== "bowler" && (
            <p className="text-xs text-emerald-400 mb-2">
              Tap a batter to set as {pickRole === "striker" ? "striker" : "non-striker"}.
            </p>
          )}
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
              {!striker && !nonStriker && (
                <tr>
                  <td colSpan={6} className="py-3 text-slate-500 text-sm">
                    No batters selected yet. Use the buttons above, then tap a name.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="mt-3 flex gap-2 flex-wrap">
            {battingXi.map((p) => (
              <button
                key={p.id}
                type="button"
                disabled={busy}
                className={cn(
                  "text-xs px-2 py-1 rounded font-medium disabled:opacity-40",
                  p.id === innings.strikerId
                    ? "bg-emerald-600 text-white ring-2 ring-emerald-300"
                    : p.id === innings.nonStrikerId
                      ? "bg-blue-700 text-white ring-2 ring-blue-300"
                      : "bg-slate-800 text-white"
                )}
                onClick={() => handlePlayerPick(p, "batting")}
              >
                {p.name.split(" ")[0]}
                {p.id === innings.strikerId ? "*" : p.id === innings.nonStrikerId ? "†" : ""}
              </button>
            ))}
          </div>
        </div>

        <div className="glass-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h4 className="text-xs uppercase tracking-wider text-slate-500">Bowler</h4>
            <button
              type="button"
              onClick={() => setPickRole(pickRole === "bowler" ? null : "bowler")}
              className={cn(
                "text-xs px-2 py-1 rounded font-semibold",
                pickRole === "bowler" ? "bg-emerald-500 text-white" : "bg-slate-800 text-white"
              )}
            >
              Set Bowler
            </button>
          </div>
          {pickRole === "bowler" && (
            <p className="text-xs text-emerald-400 mb-2">Tap a bowler below to assign.</p>
          )}
          {bowler ? (
            <p className="text-lg font-bold">
              {bowler.playerName}{" "}
              <span className="font-mono text-slate-500 text-base">
                {Math.floor(bowler.balls / 6)}.{bowler.balls % 6}-{bowler.runs}-{bowler.wickets}
              </span>
            </p>
          ) : (
            <p className="text-sm text-slate-500 mb-2">No bowler selected yet.</p>
          )}
          <div className="mt-3 flex gap-2 flex-wrap">
            {bowlingXi.map((p) => (
              <button
                key={p.id}
                type="button"
                disabled={busy}
                className={cn(
                  "text-xs px-2 py-1 rounded font-medium disabled:opacity-40",
                  p.id === innings.bowlerId
                    ? "bg-purple-700 text-white ring-2 ring-purple-300"
                    : "bg-slate-800 text-white"
                )}
                onClick={() => handlePlayerPick(p, "bowling")}
              >
                {p.name.split(" ")[0]}
              </button>
            ))}
          </div>
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
                  "h-16 sm:h-20 rounded-2xl text-2xl font-black disabled:opacity-40",
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
                className="h-14 rounded-xl bg-amber-600/90 text-white font-bold capitalize"
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
      <ScoringDebugPanel
        matchId={matchId}
        match={match}
        innings={innings}
        balls={balls}
        userRole={profile?.role}
        userId={user?.uid}
        firestoreError={live.error}
        ballsError={live.ballsError}
        networkOnline={!offline}
        validationError={participantError ?? scoringBlockedReason ?? undefined}
      />

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
