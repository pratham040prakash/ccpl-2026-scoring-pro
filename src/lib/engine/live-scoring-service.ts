import { writeBatch } from "firebase/firestore";
import type {
  Ball,
  BallAuditEntry,
  CommentaryEntry,
  Fixture,
  Innings,
  Match,
  ScoringAction,
} from "@/types";
import { generateId } from "@/lib/utils";
import { scoreBall, undoBall } from "./scoring";
import {
  enrichInningsFromBalls,
  formatOverLabel,
  rotateStrike,
} from "./innings-metrics";
import { getMilestoneCommentary } from "./commentary";
import { defaultPlayingXi } from "@/lib/live/player-roster";
import { canStartLiveScoring } from "@/lib/live/match-start";
import {
  getFirebaseDb,
  isFirebaseConfigured,
} from "@/lib/firebase/config";
import {
  COL,
  saveBall,
  saveCommentary,
  saveInnings,
  updateMatch,
  updateFixture,
  deleteBall,
  saveAuditEntry,
  createMatchDoc,
  getInnings,
  getMatch,
} from "@/lib/firebase/firestore";
import { doc } from "firebase/firestore";
import { cacheBall, cacheInnings, cacheMatch } from "@/lib/offline/store";
import { aggregateBatterScores, aggregateBowlerScores } from "./statistics";
import { detectLiveEvents } from "@/lib/live/live-events";
import { finalizeMatchViaApi, syncLiveResultToLocalStorage } from "@/lib/live/finalize-match";
import { logScoring } from "@/lib/live/scoring-logger";
import { assertMatchWritable } from "@/lib/live/match-writable";

export interface ScoringActionResult {
  ball: Ball;
  innings: Innings;
  firstInningsComplete?: boolean;
  readyToFinalize?: boolean;
}

export interface ScoringContext {
  strikerId: string;
  strikerName: string;
  nonStrikerId: string;
  nonStrikerName: string;
  bowlerId: string;
  bowlerName: string;
}

export interface ScoringUser {
  uid: string;
  email?: string;
  idToken?: string;
}

function fixtureToMatch(fixture: Fixture, battingTeamId: string): Match {
  const now = new Date().toISOString();
  const battingFirst =
    battingTeamId === fixture.teamAId ? fixture.teamAId : fixture.teamBId;
  const bowlingFirst =
    battingFirst === fixture.teamAId ? fixture.teamBId : fixture.teamAId;

  const xiA = defaultPlayingXi(fixture.teamAName).map((p) => p.id);
  const xiB = defaultPlayingXi(fixture.teamBName).map((p) => p.id);

  return {
    id: fixture.matchDocId ?? fixture.id,
    fixtureId: fixture.id,
    matchId: fixture.matchId,
    stage: fixture.stage,
    status: "live",
    date: fixture.date,
    startTime: fixture.startTime,
    ground: fixture.ground,
    overs: fixture.overs,
    teamAId: fixture.teamAId,
    teamBId: fixture.teamBId,
    teamAName: fixture.teamAName,
    teamBName: fixture.teamBName,
    battingTeamId: battingFirst,
    bowlingTeamId: bowlingFirst,
    playingXiA: xiA,
    playingXiB: xiB,
    locked: false,
    published: true,
    shareSlug: fixture.id,
    createdAt: now,
    updatedAt: now,
  };
}

export function createInitialInnings(match: Match, inningsNumber: 1 | 2): Innings {
  const now = new Date().toISOString();
  const battingTeamId = match.battingTeamId ?? match.teamAId;
  const bowlingTeamId = match.bowlingTeamId ?? match.teamBId;
  const battingTeamName =
    battingTeamId === match.teamAId ? match.teamAName : match.teamBName;
  const bowlingRoster =
    battingTeamId === match.teamAId
      ? defaultPlayingXi(match.teamBName)
      : defaultPlayingXi(match.teamAName);
  const battingRoster =
    battingTeamId === match.teamAId
      ? defaultPlayingXi(match.teamAName)
      : defaultPlayingXi(match.teamBName);

  return {
    id: generateId("inn"),
    matchId: match.id,
    teamId: battingTeamId,
    teamName: battingTeamName,
    inningsNumber,
    runs: 0,
    wickets: 0,
    overs: 0,
    balls: 0,
    extras: { total: 0, wides: 0, noBalls: 0, byes: 0, legByes: 0, penalty: 0 },
    runRate: 0,
    partnership: {
      runs: 0,
      balls: 0,
      batsman1Id: battingRoster[0]?.id ?? "",
      batsman2Id: battingRoster[1]?.id ?? "",
      batsman1Runs: 0,
      batsman2Runs: 0,
    },
    strikerId: battingRoster[0]?.id,
    nonStrikerId: battingRoster[1]?.id,
    bowlerId: bowlingRoster[0]?.id,
    completed: false,
    nextSequence: 0,
    createdAt: now,
    updatedAt: now,
  };
}

export async function updateInningsParticipants(
  innings: Innings,
  updates: Partial<Pick<Innings, "strikerId" | "nonStrikerId" | "bowlerId">>
): Promise<Innings> {
  const updated: Innings = {
    ...innings,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  if (isFirebaseConfigured()) {
    await saveInnings(updated);
  }

  await cacheInnings(updated);
  return updated;
}

export async function initializeLiveMatch(
  fixture: Fixture,
  battingTeamId?: string
): Promise<{ match: Match; innings: Innings }> {
  const gate = canStartLiveScoring(fixture);
  if (!gate.ok) {
    throw new Error(gate.reason);
  }

  const matchId = fixture.matchDocId ?? fixture.id;

  if (isFirebaseConfigured()) {
    const existingInnings = await getInnings(matchId);
    const activeFirst = existingInnings.find((i) => i.inningsNumber === 1 && !i.completed);
    if (activeFirst) {
      const existingMatch = await getMatch(matchId);
      if (existingMatch) {
        logScoring("firestore_read", "Reusing existing live match", { matchId });
        await cacheMatch(existingMatch);
        await cacheInnings(activeFirst);
        return { match: existingMatch, innings: activeFirst };
      }
    }
  }

  const batId = battingTeamId ?? fixture.teamAId;
  const match = fixtureToMatch(fixture, batId);
  const innings = createInitialInnings(match, 1);

  if (isFirebaseConfigured()) {
    await createMatchDoc(match);
    await saveInnings(innings);
    await updateMatch(match.id, { status: "live" });
    await updateFixture(fixture.id, { status: "live" });
    logScoring("firestore_write", "Live match started", { matchId: match.id, inningsId: innings.id });
  }

  await cacheMatch(match);
  await cacheInnings(innings);
  return { match, innings };
}

export async function applyScoringAction(
  match: Match,
  innings: Innings,
  existingBalls: Ball[],
  action: ScoringAction,
  ctx: ScoringContext,
  user?: ScoringUser
): Promise<ScoringActionResult> {
  assertMatchWritable(match, "score");
  const sequence = innings.nextSequence ?? existingBalls.length;

  const result = scoreBall({
    match,
    innings,
    ...ctx,
    action,
    sequence,
  });

  const updatedPartial = { ...innings, ...result.updatedInnings };
  const allBalls = [...existingBalls, result.ball];
  const metrics = enrichInningsFromBalls(updatedPartial, match, allBalls);
  const strike = rotateStrike(
    ctx.strikerId,
    ctx.nonStrikerId,
    result.rotateStrike
  );

  let strikerId = strike.strikerId;
  let nonStrikerId = strike.nonStrikerId;

  if (action.type === "wicket") {
    const outId = action.dismissedPlayerId ?? ctx.strikerId;
    if (action.newBatterId) {
      const newPlayer = action.newBatterId;
      if (outId === ctx.strikerId) {
        strikerId = newPlayer;
        nonStrikerId = ctx.nonStrikerId;
      } else {
        strikerId = ctx.strikerId;
        nonStrikerId = newPlayer;
      }
    } else if (outId === ctx.strikerId) {
      strikerId = ctx.nonStrikerId;
      nonStrikerId = ctx.nonStrikerId;
    }
  }

  const matchComplete =
    result.completeInnings && innings.inningsNumber === 2;

  const updatedInnings: Innings = {
    ...updatedPartial,
    ...metrics,
    strikerId,
    nonStrikerId,
    bowlerId: ctx.bowlerId,
    nextSequence: sequence + 1,
    updatedAt: new Date().toISOString(),
  };

  const ball: Ball = {
    ...result.ball,
    createdBy: user?.uid,
    version: sequence + 1,
  };

  const commentaryEntry: CommentaryEntry = {
    id: generateId("cmt"),
    matchId: match.id,
    ballId: ball.id,
    text: ball.commentary,
    type: ball.isWicket ? "wicket" : "ball",
    timestamp: ball.timestamp,
  };

  const auditEntry: BallAuditEntry = {
    id: generateId("audit"),
    matchId: match.id,
    inningsId: innings.id,
    action: "score",
    ballId: ball.id,
    sequence,
    overLabel: formatOverLabel(ball.overNumber, ball.ballNumber),
    snapshot: {
      innings: updatedInnings,
      ballCount: allBalls.length,
    },
    createdBy: user?.uid ?? "system",
    createdByEmail: user?.email,
    timestamp: new Date().toISOString(),
  };

  const postBallCommit = async () => {
    await cacheBall(ball);
    await cacheInnings(updatedInnings);

    const priorBatters = aggregateBatterScores(existingBalls);
    const priorBowlers = aggregateBowlerScores(existingBalls);
    const priorBatterRuns =
      priorBatters.find((b) => b.playerId === ctx.strikerId)?.runs ?? 0;
    const priorBowlerWickets =
      priorBowlers.find((b) => b.playerId === ctx.bowlerId)?.wickets ?? 0;

    const events = detectLiveEvents(
      ball,
      action,
      priorBatterRuns,
      priorBowlerWickets,
      result.completeInnings,
      matchComplete
    );
    if (typeof window !== "undefined" && events.length) {
      window.dispatchEvent(new CustomEvent("ccpl-live-event", { detail: events }));
    }

    if (updatedInnings.partnership?.runs === 50) {
      await saveCommentary({
        id: generateId("cmt"),
        matchId: match.id,
        text: getMilestoneCommentary("partnership", "", 50),
        type: "milestone",
        timestamp: new Date().toISOString(),
      });
    }
  };

  if (isFirebaseConfigured()) {
    const db = getFirebaseDb();
    const batch = writeBatch(db);
    batch.set(doc(db, COL.balls, ball.id), ball);
    batch.set(doc(db, COL.innings, updatedInnings.id), updatedInnings, { merge: true });
    batch.set(doc(db, COL.commentary, commentaryEntry.id), commentaryEntry);
    batch.set(doc(db, COL.ballAudit, auditEntry.id), auditEntry);

    if (result.completeInnings && innings.inningsNumber === 1) {
      batch.update(doc(db, COL.matches, match.id), {
        target: updatedInnings.runs + 1,
        updatedAt: new Date().toISOString(),
      });
    }

    await batch.commit();
    logScoring("firestore_write", "Ball scored", {
      matchId: match.id,
      inningsId: innings.id,
      sequence,
      runs: ball.runs,
    });

    await postBallCommit();

    if (result.completeInnings && innings.inningsNumber === 1) {
      return {
        ball,
        innings: updatedInnings,
        firstInningsComplete: true,
      };
    }
  } else {
    await saveBall(ball);
    await saveInnings(updatedInnings);
    await saveCommentary(commentaryEntry);
    await saveAuditEntry(auditEntry);
    await postBallCommit();
    if (result.completeInnings && innings.inningsNumber === 1) {
      return { ball, innings: updatedInnings, firstInningsComplete: true };
    }
  }

  if (matchComplete) {
    return { ball, innings: updatedInnings, readyToFinalize: true };
  }

  return { ball, innings: updatedInnings };
}

export async function undoLastBall(
  match: Match,
  innings: Innings,
  balls: Ball[],
  user?: ScoringUser
): Promise<Innings | null> {
  assertMatchWritable(match, "undo");
  if (balls.length === 0) return null;
  const lastBall = balls[balls.length - 1];
  const remaining = balls.slice(0, -1);
  const reverted = { ...innings, ...undoBall(innings, lastBall) };
  const metrics = enrichInningsFromBalls(reverted, match, remaining);

  const updatedInnings: Innings = {
    ...reverted,
    ...metrics,
    strikerId: lastBall.strikerId,
    nonStrikerId: lastBall.nonStrikerId,
    bowlerId: lastBall.bowlerId,
    nextSequence: Math.max(0, (innings.nextSequence ?? balls.length) - 1),
    updatedAt: new Date().toISOString(),
  };

  const auditEntry: BallAuditEntry = {
    id: generateId("audit"),
    matchId: match.id,
    inningsId: innings.id,
    action: "undo",
    ballId: lastBall.id,
    sequence: lastBall.sequence,
    overLabel: formatOverLabel(lastBall.overNumber, lastBall.ballNumber),
    snapshot: { innings: updatedInnings, ballCount: remaining.length },
    createdBy: user?.uid ?? "system",
    createdByEmail: user?.email,
    timestamp: new Date().toISOString(),
  };

  if (isFirebaseConfigured()) {
    await deleteBall(lastBall.id);
    await saveInnings(updatedInnings);
    await saveAuditEntry(auditEntry);
  }

  await cacheInnings(updatedInnings);
  return updatedInnings;
}

export async function manualFinalizeMatch(
  matchId: string,
  match: Match,
  user?: ScoringUser
): Promise<{ summary?: string }> {
  if (!user?.idToken) {
    throw new Error("Sign in again to finalize the match and update standings.");
  }
  const fin = await finalizeMatchViaApi(matchId, user.idToken);
  logScoring("finalize", fin.success ? "Manual finalize succeeded" : "Manual finalize failed", {
    matchId,
    message: fin.message,
  });
  if (!fin.success) {
    throw new Error(fin.message ?? "Failed to finalize match.");
  }
  const allInnings = await getInnings(match.id);
  syncLiveResultToLocalStorage(match, allInnings);
  return { summary: fin.summary };
}

export function canManualFinalizeMatch(
  match: Match | null,
  inningsList: Innings[]
): { ok: boolean; reason?: string } {
  if (!match) return { ok: false, reason: "Match not loaded" };
  if (match.result?.summary) return { ok: false, reason: "Match already finalized" };
  if (inningsList.length < 2) {
    return { ok: false, reason: "Both innings must exist before finalizing." };
  }
  const sorted = [...inningsList].sort((a, b) => a.inningsNumber - b.inningsNumber);
  const first = sorted[0];
  const second = sorted[1];
  const chaseComplete =
    match.target != null && second.runs >= match.target;
  const inningsDone = second.completed || second.wickets >= 10;
  if (!first.completed && first.inningsNumber === 1) {
    return { ok: false, reason: "First innings must be marked complete." };
  }
  if (!chaseComplete && !inningsDone) {
    return {
      ok: false,
      reason: "Second innings must finish (target reached, all out, or overs done) before finalizing.",
    };
  }
  return { ok: true };
}

function inningsReplayTemplate(innings: Innings): Innings {
  return {
    ...innings,
    runs: 0,
    wickets: 0,
    overs: 0,
    balls: 0,
    extras: { total: 0, wides: 0, noBalls: 0, byes: 0, legByes: 0, penalty: 0 },
    completed: false,
    nextSequence: 0,
    partnership: {
      runs: 0,
      balls: 0,
      batsman1Id: innings.strikerId ?? "",
      batsman2Id: innings.nonStrikerId ?? "",
      batsman1Runs: 0,
      batsman2Runs: 0,
    },
  };
}

export async function editBallDelivery(
  match: Match,
  innings: Innings,
  balls: Ball[],
  ballId: string,
  newAction: ScoringAction,
  reason: string,
  user?: ScoringUser
): Promise<{ ball: Ball; innings: Innings; balls: Ball[] }> {
  assertMatchWritable(match, "edit a delivery");
  const trimmedReason = reason.trim();
  if (trimmedReason.length < 3) {
    throw new Error("Enter a correction reason (at least 3 characters).");
  }

  const index = balls.findIndex((b) => b.id === ballId);
  if (index < 0) throw new Error("Ball not found");

  const originalBall = balls[index];
  const before = balls.slice(0, index);
  const innBefore = rebuildInningsFromBalls(match, inningsReplayTemplate(innings), before);

  const result = scoreBall({
    match,
    innings: innBefore,
    strikerId: originalBall.strikerId,
    strikerName: originalBall.strikerName,
    nonStrikerId: originalBall.nonStrikerId,
    nonStrikerName: originalBall.nonStrikerName,
    bowlerId: originalBall.bowlerId,
    bowlerName: originalBall.bowlerName,
    action: newAction,
    sequence: originalBall.sequence,
  });

  const updatedBall: Ball = {
    ...result.ball,
    id: originalBall.id,
    overNumber: originalBall.overNumber,
    ballNumber: originalBall.ballNumber,
    createdBy: user?.uid ?? originalBall.createdBy,
    version: (originalBall.version ?? 0) + 1,
  };

  const newBalls = [...balls.slice(0, index), updatedBall, ...balls.slice(index + 1)];
  const rebuilt = rebuildInningsFromBalls(match, inningsReplayTemplate(innings), newBalls);
  const metrics = enrichInningsFromBalls(rebuilt, match, newBalls);
  const finalInnings: Innings = {
    ...rebuilt,
    ...metrics,
    nextSequence: newBalls.length,
    updatedAt: new Date().toISOString(),
  };

  const auditEntry: BallAuditEntry = {
    id: generateId("audit"),
    matchId: match.id,
    inningsId: innings.id,
    action: "edit",
    ballId: originalBall.id,
    sequence: originalBall.sequence,
    overLabel: formatOverLabel(originalBall.overNumber, originalBall.ballNumber),
    snapshot: { innings: finalInnings, ballCount: newBalls.length },
    originalBall,
    updatedBall,
    reason: trimmedReason,
    createdBy: user?.uid ?? "system",
    createdByEmail: user?.email,
    timestamp: new Date().toISOString(),
  };

  if (isFirebaseConfigured()) {
    await saveBall(updatedBall);
    await saveInnings(finalInnings);
    await saveAuditEntry(auditEntry);
  }

  await cacheBall(updatedBall);
  await cacheInnings(finalInnings);
  logScoring("edit", "Ball corrected", {
    ballId: originalBall.id,
    from: originalBall.runs,
    to: updatedBall.runs,
    reason: trimmedReason,
  });

  return { ball: updatedBall, innings: finalInnings, balls: newBalls };
}

export async function startSecondInnings(match: Match, firstInnings: Innings): Promise<Innings> {
  const target = firstInnings.runs + 1;
  const swapped = {
    ...match,
    target,
    battingTeamId: match.bowlingTeamId,
    bowlingTeamId: match.battingTeamId,
  };

  const existing = await getInnings(match.id);
  const activeSecond = existing.find((i) => i.inningsNumber === 2 && !i.completed);
  if (activeSecond) {
    logScoring("firestore_read", "Reusing existing second innings", { inningsId: activeSecond.id });
    return activeSecond;
  }

  await updateMatch(match.id, {
    target,
    battingTeamId: swapped.battingTeamId,
    bowlingTeamId: swapped.bowlingTeamId,
  });
  const innings = createInitialInnings(swapped, 2);
  await saveInnings(innings);
  await cacheInnings(innings);
  logScoring("firestore_write", "Second innings started", { inningsId: innings.id, target });
  return innings;
}

function ballToAction(ball: Ball): ScoringAction {
  if (ball.isWicket) {
    return {
      type: "wicket",
      dismissal: ball.dismissal,
      dismissedPlayerId: ball.dismissedPlayerId,
      fielderId: ball.fielderId,
      runs: ball.batsmanRuns,
    };
  }
  if (ball.extra === "wide") return { type: "wide", runs: Math.max(0, ball.runs - 1) };
  if (ball.extra === "no_ball") return { type: "no_ball", runs: ball.batsmanRuns };
  if (ball.extra === "bye") return { type: "bye", runs: ball.runs };
  if (ball.extra === "leg_bye") return { type: "leg_bye", runs: ball.runs };
  if (ball.extra === "penalty") return { type: "penalty", runs: ball.runs };
  if (ball.batsmanRuns === 0 && ball.runs === 0) return { type: "dot" };
  return { type: "runs", runs: ball.batsmanRuns };
}

function rebuildInningsFromBalls(
  match: Match,
  template: Innings,
  balls: Ball[]
): Innings {
  let inn: Innings = {
    ...template,
    runs: 0,
    wickets: 0,
    overs: 0,
    balls: 0,
    extras: { total: 0, wides: 0, noBalls: 0, byes: 0, legByes: 0, penalty: 0 },
    completed: false,
    nextSequence: 0,
  };

  for (const ball of balls) {
    const result = scoreBall({
      match,
      innings: inn,
      strikerId: ball.strikerId,
      strikerName: ball.strikerName,
      nonStrikerId: ball.nonStrikerId,
      nonStrikerName: ball.nonStrikerName,
      bowlerId: ball.bowlerId,
      bowlerName: ball.bowlerName,
      action: ballToAction(ball),
      sequence: ball.sequence,
    });
    const strike = rotateStrike(ball.strikerId, ball.nonStrikerId, result.rotateStrike);
    inn = {
      ...inn,
      ...result.updatedInnings,
      strikerId: strike.strikerId,
      nonStrikerId: strike.nonStrikerId,
      bowlerId: ball.bowlerId,
      nextSequence: ball.sequence + 1,
    };
  }

  const metrics = enrichInningsFromBalls(inn, match, balls);
  const last = balls[balls.length - 1];
  return {
    ...inn,
    ...metrics,
    strikerId: last?.strikerId ?? template.strikerId,
    nonStrikerId: last?.nonStrikerId ?? template.nonStrikerId,
    bowlerId: last?.bowlerId ?? template.bowlerId,
    nextSequence: balls.length,
    updatedAt: new Date().toISOString(),
  };
}

export async function restoreToOver(
  match: Match,
  innings: Innings,
  balls: Ball[],
  targetOver: number,
  targetBall: number,
  user?: ScoringUser,
  reason?: string
): Promise<Innings> {
  assertMatchWritable(match, "restore score");
  const keep = balls.filter((b) => {
    if (b.overNumber < targetOver) return true;
    if (b.overNumber > targetOver) return false;
    if (!b.isLegalDelivery) return b.ballNumber <= targetBall;
    return b.ballNumber <= targetBall;
  });

  const toDelete = balls.filter((b) => !keep.some((k) => k.id === b.id));
  const updatedInnings = rebuildInningsFromBalls(match, innings, keep);

  if (isFirebaseConfigured()) {
    for (const b of toDelete) {
      await deleteBall(b.id);
    }
    await saveInnings(updatedInnings);
    await saveAuditEntry({
      id: generateId("audit"),
      matchId: match.id,
      inningsId: innings.id,
      action: "restore",
      sequence: keep.length,
      overLabel: formatOverLabel(targetOver, targetBall),
      snapshot: { innings: updatedInnings, ballCount: keep.length },
      reason: reason?.trim() || undefined,
      createdBy: user?.uid ?? "system",
      createdByEmail: user?.email,
      timestamp: new Date().toISOString(),
    });
  }

  return updatedInnings;
}

export async function pauseMatch(matchId: string): Promise<void> {
  await updateMatch(matchId, { status: "paused" });
}

export async function resumeMatch(matchId: string): Promise<void> {
  await updateMatch(matchId, { status: "live" });
}
