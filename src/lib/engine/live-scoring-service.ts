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
  deleteBall,
  saveAuditEntry,
  createMatchDoc,
  getInnings,
} from "@/lib/firebase/firestore";
import { doc } from "firebase/firestore";
import { cacheBall, cacheInnings } from "@/lib/offline/store";
import { aggregateBatterScores, aggregateBowlerScores } from "./statistics";
import { detectLiveEvents } from "@/lib/live/live-events";
import { finalizeMatchViaApi, syncLiveResultToLocalStorage } from "@/lib/live/finalize-match";

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
  const battingTeamId =
    inningsNumber === 1
      ? match.battingTeamId ?? match.teamAId
      : match.bowlingTeamId ?? match.teamBId;
  const battingTeamName =
    battingTeamId === match.teamAId ? match.teamAName : match.teamBName;
  const bowlingTeamId =
    battingTeamId === match.teamAId ? match.teamBId : match.teamAId;
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

export async function initializeLiveMatch(
  fixture: Fixture,
  battingTeamId?: string
): Promise<{ match: Match; innings: Innings }> {
  const batId = battingTeamId ?? fixture.teamAId;
  const match = fixtureToMatch(fixture, batId);
  const innings = createInitialInnings(match, 1);

  if (isFirebaseConfigured()) {
    await createMatchDoc(match);
    await saveInnings(innings);
    await updateMatch(match.id, { status: "live" });
  }

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
): Promise<{ ball: Ball; innings: Innings }> {
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

  if (isFirebaseConfigured()) {
    const db = getFirebaseDb();
    const batch = writeBatch(db);
    batch.set(doc(db, COL.balls, ball.id), ball);
    batch.set(doc(db, COL.innings, updatedInnings.id), updatedInnings, { merge: true });
    batch.set(doc(db, COL.commentary, commentaryEntry.id), commentaryEntry);
    batch.set(doc(db, COL.ballAudit, auditEntry.id), auditEntry);

    if (result.completeInnings) {
      if (innings.inningsNumber === 1) {
        batch.update(doc(db, COL.matches, match.id), {
          target: updatedInnings.runs + 1,
          updatedAt: new Date().toISOString(),
        });
        await batch.commit();
        await startSecondInnings(
          { ...match, target: updatedInnings.runs + 1 },
          updatedInnings
        );
        return { ball, innings: updatedInnings };
      }
      batch.update(doc(db, COL.matches, match.id), {
        status: "completed",
        updatedAt: new Date().toISOString(),
      });
    }

    await batch.commit();
  } else {
    await saveBall(ball);
    await saveInnings(updatedInnings);
    await saveCommentary(commentaryEntry);
    await saveAuditEntry(auditEntry);
  }

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

  if (matchComplete && user?.idToken) {
    await finalizeMatchViaApi(match.id, user.idToken);
    const allInnings = await getInnings(match.id);
    syncLiveResultToLocalStorage(match, allInnings);
  }

  if (updatedInnings.partnership.runs === 50) {
    await saveCommentary({
      id: generateId("cmt"),
      matchId: match.id,
      text: getMilestoneCommentary("partnership", "", 50),
      type: "milestone",
      timestamp: new Date().toISOString(),
    });
  }

  return { ball, innings: updatedInnings };
}

export async function undoLastBall(
  match: Match,
  innings: Innings,
  balls: Ball[],
  user?: ScoringUser
): Promise<Innings | null> {
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

export async function startSecondInnings(match: Match, firstInnings: Innings): Promise<Innings> {
  const target = firstInnings.runs + 1;
  await updateMatch(match.id, { target, battingTeamId: match.bowlingTeamId, bowlingTeamId: match.battingTeamId });
  const innings = createInitialInnings(
    { ...match, target, battingTeamId: match.bowlingTeamId, bowlingTeamId: match.battingTeamId },
    2
  );
  await saveInnings(innings);
  await cacheInnings(innings);
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
  user?: ScoringUser
): Promise<Innings> {
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
