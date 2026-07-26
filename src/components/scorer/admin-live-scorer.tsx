"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pause,
  Play,
  Undo2,
} from "lucide-react";
import type { DismissalType, Innings, Match, ScoringAction, Ball } from "@/types";
import { formatOvers } from "@/lib/utils";
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
  editBallDelivery,
  manualFinalizeMatch,
  canManualFinalizeMatch,
  startSecondInnings,
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
import { MatchHealthPanel } from "@/components/scorer/match-health-panel";
import { ConnectionStatusBar } from "@/components/scorer/connection-status-bar";
import { RecoveryCenter } from "@/components/scorer/recovery-center";
import { BallCorrectionPanel } from "@/components/scorer/ball-correction-panel";
import { BallAuditHistory, formatBallForPicker } from "@/components/scorer/ball-audit-history";
import { useConnectionStatus } from "@/hooks/use-connection-status";
import { useScoringLock } from "@/hooks/use-scoring-lock";
import { CONFIRM } from "@/lib/live/operator-confirm";
import {
  loadRecoveryCheckpoint,
  saveRecoveryCheckpoint,
  isCheckpointNewer,
} from "@/lib/offline/recovery";
import { WicketFlow } from "@/components/scorer/wicket-flow";
import { ParticipantWorkspace } from "@/components/scorer/participant-workspace";
import { ScoringPad } from "@/components/scorer/scoring-pad";
import {
  ParticipantPickerSheet,
  tryAutoSelectSingleBowler,
} from "@/components/scorer/participant-picker-sheet";
import type { ParticipantPickMode } from "@/components/scorer/quick-actions-bar";
import {
  ballCompletedOver,
  getEligibleBowlers,
  getNextSuggestedBatter,
  getPreviousOverBowlerId,
  isCaptain,
  loadBattingOrder,
  saveBattingOrder,
} from "@/lib/live/participant-selection";
import { aggregateBatterScores, aggregateBowlerScores } from "@/lib/engine/statistics";
import { queueOfflineAction } from "@/lib/offline/store";
import { syncPendingActions } from "@/lib/offline/sync";
import { generateId } from "@/lib/utils";
import { canStartLiveScoring, formatLiveStartError } from "@/lib/live/match-start";

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
  const [restoreOver, setRestoreOver] = useState("0");
  const [restoreBall, setRestoreBall] = useState("0");
  const [started, setStarted] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [bootstrappedMatch, setBootstrappedMatch] = useState<Match | null>(null);
  const [bootstrappedInnings, setBootstrappedInnings] = useState<Innings | null>(null);
  const [pendingDismissal, setPendingDismissal] = useState<DismissalType | null>(null);
  const [pickMode, setPickMode] = useState<ParticipantPickMode | null>(null);
  const [battingOrder, setBattingOrder] = useState<string[]>([]);
  const [lineupCollapsed, setLineupCollapsed] = useState(true);
  const [pickerMessage, setPickerMessage] = useState<string | null>(null);
  const [participantError, setParticipantError] = useState<string | null>(null);
  const [participantsSynced, setParticipantsSynced] = useState(false);
  const [pendingBalls, setPendingBalls] = useState<Ball[]>([]);
  const [auditRefreshKey, setAuditRefreshKey] = useState(0);
  const [finalizeMessage, setFinalizeMessage] = useState<string | null>(null);
  const [recoveryNotice, setRecoveryNotice] = useState<string | null>(null);

  const fixture = live.fixture;
  const match = pickMatch(live.match, bootstrappedMatch);
  const innings = pickInnings(live.currentInnings, bootstrappedInnings);
  const connection = useConnectionStatus(matchId);
  const scoringLock = useScoringLock(
    matchId,
    user?.uid,
    profile?.displayName,
    profile?.email
  );
  const scoringDisabled =
    busy ||
    match?.status === "paused" ||
    match?.locked ||
    scoringLock.readOnly;
  const balls = useMemo(
    () => mergeBallLists(live.balls, pendingBalls),
    [live.balls, pendingBalls]
  );

  useEffect(() => {
    setParticipantsSynced(false);
    setPickMode(null);
    setParticipantError(null);
    setPickerMessage(null);
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
    if (!match || !innings) return;
    const checkpoint = loadRecoveryCheckpoint(match.id);
    if (checkpoint && isCheckpointNewer(checkpoint, innings, balls.length)) {
      setRecoveryNotice(
        `Local recovery checkpoint from ${new Date(checkpoint.savedAt).toLocaleString()} (${checkpoint.ballCount} balls). Refresh restored from Firestore; re-score if counts differ.`
      );
    }
  }, [match?.id, innings?.id, balls.length, match, innings]);

  useEffect(() => {
    const onOnline = async () => {
      if (user) {
        const su = await buildScoringUser(user);
        await syncPendingActions(matchId, su, fixture ?? undefined);
        connection.refreshPending();
      }
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [matchId, user, fixture, connection]);

  const battingXi = useMemo(() => {
    return resolveBattingBowlingXis(fixture, match, innings).battingXi;
  }, [fixture, innings, match?.playingXiA, match?.playingXiB]);

  const bowlingXi = useMemo(() => {
    return resolveBattingBowlingXis(fixture, match, innings).bowlingXi;
  }, [fixture, innings, match?.playingXiA, match?.playingXiB]);

  useEffect(() => {
    if (!match || !innings || battingXi.length === 0) return;
    setBattingOrder(loadBattingOrder(match.id, innings.id, battingXi));
  }, [match?.id, innings?.id, battingXi, match, innings]);

  const batters = useMemo(() => aggregateBatterScores(balls), [balls]);
  const bowlers = useMemo(() => aggregateBowlerScores(balls), [balls]);

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

  const finalizeGate = useMemo(
    () => canManualFinalizeMatch(match, live.innings),
    [match, live.innings]
  );

  const bumpAudit = () => setAuditRefreshKey((k) => k + 1);

  useEffect(() => {
    if (!innings || participantsSynced || busy) return;
    if (!battingXi.length || !bowlingXi.length) return;
    if (innings.strikerId && innings.nonStrikerId && innings.bowlerId) {
      setParticipantsSynced(true);
      return;
    }

    const order =
      battingOrder.length > 0 ? battingOrder : battingXi.map((p) => p.id);
    const updates = {
      strikerId: innings.strikerId ?? order[0],
      nonStrikerId: innings.nonStrikerId ?? order[1] ?? order[0],
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
  }, [innings, battingXi, bowlingXi, battingOrder, participantsSynced, busy]);

  const battingTeamName = innings?.teamName ?? fixture?.teamAName ?? "";
  const bowlingTeamName =
    innings && fixture
      ? innings.teamId === fixture.teamAId
        ? fixture.teamBName
        : fixture.teamAName
      : "";

  const isBattingCaptain = useCallback(
    (p: RosterPlayer) => isCaptain(p, battingTeamName),
    [battingTeamName]
  );
  const isBowlingCaptain = useCallback(
    (p: RosterPlayer) => isCaptain(p, bowlingTeamName),
    [bowlingTeamName]
  );

  const handleReorderBatting = (order: string[]) => {
    setBattingOrder(order);
    if (match && innings) saveBattingOrder(match.id, innings.id, order);
  };

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
      setPickMode(null);
    } catch (error) {
      setParticipantError(formatLiveStartError(error));
    } finally {
      setBusy(false);
    }
  };

  const openParticipantPick = (mode: ParticipantPickMode) => {
    if (!match || !innings) return;
    if (mode === "bowler" || mode === "opener_bowler") {
      const eligible = getEligibleBowlers(
        bowlingXi,
        bowlers,
        innings.bowlerId,
        match.overs
      );
      if (
        tryAutoSelectSingleBowler(eligible, (player) => {
          void handleSetParticipant("bowler", player);
        })
      ) {
        return;
      }
    }
    setPickMode(mode);
    setPickerMessage(null);
  };

  const handlePickFromSheet = (player: RosterPlayer, mode: ParticipantPickMode) => {
    if (mode === "bowler" || mode === "opener_bowler") {
      void handleSetParticipant("bowler", player);
    } else if (mode === "non_striker" || mode === "opener_non_striker") {
      void handleSetParticipant("non_striker", player);
    } else {
      void handleSetParticipant("striker", player);
    }
  };

  const handleSwapStrike = async () => {
    if (!innings?.strikerId || !innings.nonStrikerId || busy) return;
    setBusy(true);
    try {
      const updated = await updateInningsParticipants(innings, {
        strikerId: innings.nonStrikerId,
        nonStrikerId: innings.strikerId,
      });
      setBootstrappedInnings(updated);
    } catch (error) {
      setParticipantError(formatLiveStartError(error));
    } finally {
      setBusy(false);
    }
  };

  const handleQuickNextBatter = () => {
    const next = getNextSuggestedBatter(battingXi, battingOrder, {
      outIds: outBatterIds,
      strikerId: innings?.strikerId,
      nonStrikerId: innings?.nonStrikerId,
    });
    if (next) void handleSetParticipant("striker", next);
    else openParticipantPick("striker");
  };

  const handleQuickRecentBowler = () => {
    const prevId = getPreviousOverBowlerId(balls);
    const player = bowlingXi.find((p) => p.id === prevId);
    if (player) void handleSetParticipant("bowler", player);
    else openParticipantPick("bowler");
  };

  const maybePromptNextBowler = (scoredBall: Ball) => {
    if (!match || !innings || !ballCompletedOver(scoredBall)) return;
    const projected = enrichInningsFromBalls(
      { ...innings, ...{ runs: innings.runs, wickets: innings.wickets } },
      match,
      [...balls, scoredBall]
    );
    if (projected.completed) return;
    openParticipantPick("bowler");
  };

  const handleStart = async () => {
    if (!fixture) return;
    if (!startGate.ok) {
      setStartError(startGate.reason);
      return;
    }
    const ok = await CONFIRM.startMatch(`${fixture.teamAName} vs ${fixture.teamBName}`);
    if (!ok) return;
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
    if (!match || !innings || scoringDisabled) return;
    const context = ctx();
    if (!context) {
      setParticipantError(scoringBlockedReason ?? "Set striker, non-striker, and bowler before scoring.");
      return;
    }

    setBusy(true);
    setParticipantError(null);
    try {
      const isOffline = connection.state === "offline";
      if (isOffline) {
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
        saveRecoveryCheckpoint(match, preview, allBalls, user?.uid);
        maybePromptNextBowler(result.ball);
      } else {
        const su = await scoringUser();
        const result = await applyScoringAction(match, innings, balls, action, context, su);
        setBootstrappedInnings(result.innings);
        setPendingBalls((prev) => [...prev, result.ball]);
        saveRecoveryCheckpoint(match, result.innings, [...balls, result.ball], user?.uid);
        logScoring("score_submitted", "Ball applied online", { runs: result.ball.runs });
        maybePromptNextBowler(result.ball);

        if (result.firstInningsComplete) {
          const proceed = await CONFIRM.endInnings(1);
          if (proceed) {
            await startSecondInnings(
              { ...match, target: result.innings.runs + 1 },
              result.innings
            );
            live.refresh();
          }
        }

        if (result.readyToFinalize) {
          const proceed = await CONFIRM.finalizeMatch();
          if (proceed) {
            const fin = await manualFinalizeMatch(match.id, match, su);
            setFinalizeMessage(fin.summary ?? "Match finalized.");
            live.refresh();
          }
        }
      }
      setWicketMode(false);
      setExtrasMode(null);
      bumpAudit();
    } catch (error) {
      setParticipantError(formatLiveStartError(error));
    } finally {
      setBusy(false);
    }
  };

  const handleUndo = async () => {
    if (!match || !innings || balls.length === 0 || scoringDisabled) return;
    const last = balls[balls.length - 1];
    const ok = await CONFIRM.undoBall(
      `${last.overNumber}.${last.ballNumber} (${last.runs} runs)`
    );
    if (!ok) return;
    setBusy(true);
    setParticipantError(null);
    try {
      const su = await scoringUser();
      const updated = await undoLastBall(match, innings, balls, su);
      if (updated) {
        setBootstrappedInnings(updated);
        setPendingBalls([]);
        bumpAudit();
      }
    } catch (error) {
      setParticipantError(formatLiveStartError(error));
    } finally {
      setBusy(false);
    }
  };

  const handleRestore = async (reason: string) => {
    if (!match || !innings || scoringDisabled) return;
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
        su,
        reason
      );
      setBootstrappedInnings(updated);
      setPendingBalls([]);
      bumpAudit();
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
          Standings and leaderboards updated.
        </p>
      </div>
    );
  }

  if (match.status === "completed" && !match.result) {
    return (
      <div className="glass-card p-10 text-center max-w-lg mx-auto space-y-4">
        <h2 className="text-2xl font-black text-amber-500">Finalize Required</h2>
        <p className="text-slate-500">
          Match is marked complete but results were not saved. Use manual finalize to update
          standings and leaderboards.
        </p>
        {finalizeMessage && (
          <p className="text-sm whitespace-pre-wrap text-red-400">{finalizeMessage}</p>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            if (!match) return;
            setBusy(true);
            setFinalizeMessage(null);
            try {
              const su = await scoringUser();
              const result = await manualFinalizeMatch(match.id, match, su);
              setFinalizeMessage(result.summary ?? "Match finalized successfully.");
              live.refresh();
            } catch (error) {
              setFinalizeMessage(formatLiveStartError(error));
            } finally {
              setBusy(false);
            }
          }}
          className="px-6 py-3 rounded-xl bg-emerald-600 text-white font-bold disabled:opacity-50"
        >
          {busy ? "Finalizing…" : "Finalize Match"}
        </button>
      </div>
    );
  }

  const need = match.target ? runsNeeded(match, innings) : undefined;
  const ballsLeft = ballsRemaining(match, innings);

  return (
    <div className="space-y-4 pb-32">
      {recoveryNotice && (
        <p className="text-sm text-amber-400 glass-card p-3">{recoveryNotice}</p>
      )}

      {scoringLock.readOnly && scoringLock.holder && (
        <div className="glass-card p-4 flex flex-wrap items-center justify-between gap-3 border border-amber-500/30">
          <p className="text-sm text-amber-200">
            Read-only — {scoringLock.holder.displayName ?? scoringLock.holder.email ?? "Another scorer"} is
            actively scoring this match.
          </p>
          <button
            type="button"
            className="px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-semibold"
            onClick={async () => {
              if (!(await CONFIRM.takeOverScoring(scoringLock.holder?.displayName))) return;
              await scoringLock.takeOver();
            }}
          >
            Take over scoring
          </button>
        </div>
      )}

      <ConnectionStatusBar
        state={connection.state}
        pendingCount={connection.pendingCount}
        lastSyncAt={connection.lastSyncAt}
      />

      {/* Header strip */}
      <div className="glass-card p-4 gradient-hero text-white">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="live-badge">LIVE</span>
              {match.status === "paused" && (
                <span className="text-xs bg-amber-500/30 px-2 py-0.5 rounded-full">PAUSED</span>
              )}
              {connection.state !== "connected" && (
                <span className="text-xs bg-amber-500/30 px-2 py-0.5 rounded-full">
                  {connection.state === "offline" ? "Offline queue" : "Syncing"}
                </span>
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

      {(participantError || pickerMessage || scoringBlockedReason || live.ballsError) && (
        <div className="glass-card p-3 border border-amber-500/40 bg-amber-500/10 text-amber-100 text-sm">
          {participantError ?? pickerMessage ?? live.ballsError ?? scoringBlockedReason}
        </div>
      )}

      <ScoringPad
        disabled={scoringDisabled}
        paused={match.status === "paused"}
        extrasMode={extrasMode}
        wicketMode={wicketMode}
        dismissals={DISMISSALS}
        onScore={handleScore}
        onExtrasMode={setExtrasMode}
        onWicketMode={setWicketMode}
        onPendingDismissal={setPendingDismissal}
        lastBallLabel={
          balls.length > 0
            ? `${balls[balls.length - 1].overNumber}.${balls[balls.length - 1].ballNumber} (${balls[balls.length - 1].runs})`
            : undefined
        }
      />

      <ParticipantWorkspace
        innings={innings}
        matchOvers={match.overs}
        battingXi={battingXi}
        bowlingXi={bowlingXi}
        battingTeamName={battingTeamName}
        bowlingTeamName={bowlingTeamName}
        batters={batters}
        bowlers={bowlers}
        balls={balls}
        order={battingOrder.length ? battingOrder : battingXi.map((p) => p.id)}
        outIds={outBatterIds}
        busy={scoringDisabled}
        lineupCollapsed={lineupCollapsed}
        onToggleLineup={() => setLineupCollapsed((c) => !c)}
        onReorder={handleReorderBatting}
        onOpenPick={openParticipantPick}
        onUndo={handleUndo}
        onSwapStrike={handleSwapStrike}
        onNextBatter={handleQuickNextBatter}
        onRecentBowler={handleQuickRecentBowler}
      />

      <ParticipantPickerSheet
        open={pickMode !== null}
        mode={pickMode ?? "striker"}
        battingXi={battingXi}
        bowlingXi={bowlingXi}
        batters={batters}
        bowlers={bowlers}
        balls={balls}
        order={battingOrder.length ? battingOrder : battingXi.map((p) => p.id)}
        matchOvers={match.overs}
        strikerId={innings.strikerId}
        nonStrikerId={innings.nonStrikerId}
        bowlerId={innings.bowlerId}
        outIds={outBatterIds}
        teamName={battingTeamName}
        bowlingTeamName={bowlingTeamName}
        isBattingCaptain={isBattingCaptain}
        isBowlingCaptain={isBowlingCaptain}
        onClose={() => setPickMode(null)}
        onPickBatter={handlePickFromSheet}
        onPickBowler={(player) => void handleSetParticipant("bowler", player)}
        onValidationError={setPickerMessage}
      />

      <WicketFlow
        open={Boolean(pendingDismissal)}
        dismissal={pendingDismissal}
        battingXi={battingXi}
        bowlingXi={bowlingXi}
        batters={batters}
        order={battingOrder.length ? battingOrder : battingXi.map((p) => p.id)}
        strikerId={innings.strikerId ?? ""}
        nonStrikerId={innings.nonStrikerId ?? ""}
        outBatterIds={outBatterIds}
        teamName={bowlingTeamName}
        isBattingCaptain={isBattingCaptain}
        isBowlingCaptain={isBowlingCaptain}
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

      <MatchHealthPanel
        matchId={matchId}
        match={match}
        innings={innings}
        balls={balls}
        connectionState={connection.state}
        pendingCount={connection.pendingCount}
        lastSyncAt={connection.lastSyncAt}
        firestoreError={live.error}
        ballsError={live.ballsError}
        scoringReadOnly={scoringLock.readOnly}
        lockHolder={scoringLock.holder}
        networkOnline={connection.state !== "offline"}
      />

      <ScoringDebugPanel
        matchId={matchId}
        match={match}
        innings={innings}
        balls={balls}
        userRole={profile?.role}
        userId={user?.uid}
        firestoreError={live.error}
        ballsError={live.ballsError}
        networkOnline={connection.state !== "offline"}
        validationError={participantError ?? scoringBlockedReason ?? undefined}
      />

      <RecoveryCenter
        balls={balls}
        disabled={scoringDisabled}
        onRestore={async (over, ball, reason) => {
          setRestoreOver(String(over));
          setRestoreBall(String(ball));
          await handleRestore(reason);
        }}
      />

      <div className="glass-card p-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={scoringDisabled}
          onClick={handleUndo}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 text-white text-sm disabled:opacity-40"
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
        {(finalizeGate.ok || live.innings.length >= 2) && (
          <button
            type="button"
            disabled={busy || !finalizeGate.ok}
            title={finalizeGate.reason}
            onClick={async () => {
              if (!match || !finalizeGate.ok) return;
              if (!(await CONFIRM.finalizeMatch())) return;
              setBusy(true);
              setParticipantError(null);
              try {
                const su = await scoringUser();
                const result = await manualFinalizeMatch(match.id, match, su);
                setFinalizeMessage(result.summary ?? "Match finalized.");
                live.refresh();
              } catch (error) {
                setParticipantError(formatLiveStartError(error));
              } finally {
                setBusy(false);
              }
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-700 text-white text-sm disabled:opacity-40"
          >
            Finalize Match
          </button>
        )}
      </div>

      {finalizeMessage && (
        <p className="text-sm text-emerald-400">{finalizeMessage}</p>
      )}

      <BallCorrectionPanel
        balls={balls}
        disabled={scoringDisabled}
        onCorrect={async (ballId, action, reason) => {
          if (!match || !innings) return;
          const ball = balls.find((b) => b.id === ballId);
          if (ball && !(await CONFIRM.editBall(formatBallForPicker(ball)))) return;
          const su = await scoringUser();
          const result = await editBallDelivery(match, innings, balls, ballId, action, reason, su);
          setBootstrappedInnings(result.innings);
          setPendingBalls([]);
          bumpAudit();
        }}
      />

      <BallAuditHistory matchId={match.id} refreshKey={auditRefreshKey} />
    </div>
  );
}
