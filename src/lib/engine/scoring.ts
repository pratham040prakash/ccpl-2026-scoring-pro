import type {
  Ball,
  BallExtra,
  DismissalType,
  Innings,
  Match,
  ScoringAction,
} from "@/types";
import { generateId, totalBalls } from "@/lib/utils";
import { generateCommentary } from "./commentary";

export interface ScoreBallInput {
  match: Match;
  innings: Innings;
  strikerId: string;
  strikerName: string;
  nonStrikerId: string;
  nonStrikerName: string;
  bowlerId: string;
  bowlerName: string;
  action: ScoringAction;
  sequence: number;
}

export function scoreBall(input: ScoreBallInput): {
  ball: Ball;
  updatedInnings: Partial<Innings>;
  rotateStrike: boolean;
  completeOver: boolean;
  completeInnings: boolean;
} {
  const { match, innings, action } = input;
  const overNumber = innings.overs;
  const ballNumber = innings.balls + 1;
  let runs = 0;
  let batsmanRuns = 0;
  let extra: BallExtra = null;
  let isLegalDelivery = true;
  let isWicket = false;
  let dismissal: DismissalType | undefined;
  let dismissedPlayerId: string | undefined;
  let rotateStrike = false;
  let completeOver = false;

  switch (action.type) {
    case "dot":
      runs = 0;
      batsmanRuns = 0;
      isLegalDelivery = true;
      break;
    case "runs":
      runs = action.runs ?? 0;
      batsmanRuns = runs;
      isLegalDelivery = true;
      rotateStrike = runs % 2 === 1;
      break;
    case "wide":
      runs = 1 + (action.runs ?? 0);
      batsmanRuns = 0;
      extra = "wide";
      isLegalDelivery = false;
      rotateStrike = runs % 2 === 1;
      break;
    case "no_ball":
      runs = 1 + (action.runs ?? 0);
      batsmanRuns = action.runs ?? 0;
      extra = "no_ball";
      isLegalDelivery = false;
      if ((action.runs ?? 0) % 2 === 1) rotateStrike = true;
      break;
    case "bye":
      runs = action.runs ?? 1;
      batsmanRuns = 0;
      extra = "bye";
      isLegalDelivery = true;
      rotateStrike = runs % 2 === 1;
      break;
    case "leg_bye":
      runs = action.runs ?? 1;
      batsmanRuns = 0;
      extra = "leg_bye";
      isLegalDelivery = true;
      rotateStrike = runs % 2 === 1;
      break;
    case "penalty":
      runs = action.runs ?? 5;
      batsmanRuns = 0;
      extra = "penalty";
      isLegalDelivery = false;
      break;
    case "wicket":
      runs = action.runs ?? 0;
      batsmanRuns = runs;
      isWicket = true;
      isLegalDelivery = true;
      dismissal = action.dismissal ?? "bowled";
      dismissedPlayerId = action.dismissedPlayerId ?? input.strikerId;
      rotateStrike = runs % 2 === 1;
      break;
  }

  const newRuns = innings.runs + runs;
  const newWickets = innings.wickets + (isWicket ? 1 : 0);
  let newOvers = innings.overs;
  let newBalls = innings.balls;

  if (isLegalDelivery) {
    if (ballNumber >= 6) {
      newOvers += 1;
      newBalls = 0;
      completeOver = true;
      if (!rotateStrike) rotateStrike = true;
    } else {
      newBalls = ballNumber;
    }
  }

  const extras = { ...innings.extras };
  extras.total += runs - batsmanRuns + (extra === "penalty" ? runs : 0);
  if (extra === "wide") extras.wides += runs;
  if (extra === "no_ball") extras.noBalls += 1;
  if (extra === "bye") extras.byes += runs;
  if (extra === "leg_bye") extras.legByes += runs;
  if (extra === "penalty") extras.penalty += runs;

  const totalDeliveries = totalBalls(newOvers, newBalls);
  const runRate = totalDeliveries > 0 ? (newRuns / totalDeliveries) * 6 : 0;

  const maxBalls = match.overs * 6;
  const currentBalls = totalBalls(newOvers, newBalls);
  const chasedTarget =
    innings.inningsNumber === 2 &&
    match.target != null &&
    newRuns >= match.target;
  const completeInnings =
    newWickets >= 10 || currentBalls >= maxBalls || chasedTarget;

  const commentary = generateCommentary({
    action,
    runs,
    batsmanRuns,
    strikerName: input.strikerName,
    bowlerName: input.bowlerName,
    isWicket,
    dismissal,
    inningsRuns: newRuns,
    inningsWickets: newWickets,
  });

  const ball: Ball = {
    id: generateId("ball"),
    matchId: match.id,
    inningsId: innings.id,
    overNumber,
    ballNumber: isLegalDelivery ? ballNumber : innings.balls,
    sequence: input.sequence,
    bowlerId: input.bowlerId,
    bowlerName: input.bowlerName,
    strikerId: input.strikerId,
    strikerName: input.strikerName,
    nonStrikerId: input.nonStrikerId,
    nonStrikerName: input.nonStrikerName,
    runs,
    batsmanRuns,
    extra,
    isWicket,
    dismissal,
    dismissedPlayerId,
    fielderId: action.fielderId,
    commentary,
    timestamp: new Date().toISOString(),
    isLegalDelivery,
  };

  return {
    ball,
    updatedInnings: {
      runs: newRuns,
      wickets: newWickets,
      overs: newOvers,
      balls: newBalls,
      extras,
      runRate: Math.round(runRate * 100) / 100,
      completed: completeInnings,
    },
    rotateStrike,
    completeOver,
    completeInnings,
  };
}

export function undoBall(
  innings: Innings,
  ball: Ball
): Partial<Innings> {
  let newOvers = innings.overs;
  let newBalls = innings.balls;

  if (ball.isLegalDelivery) {
    if (innings.balls === 0 && innings.overs > 0) {
      newOvers = innings.overs - 1;
      newBalls = 5;
    } else if (innings.balls > 0) {
      newBalls = innings.balls - 1;
    }
  }

  const extras = { ...innings.extras };
  extras.total -= ball.runs - ball.batsmanRuns;
  if (ball.extra === "wide") extras.wides -= ball.runs;
  if (ball.extra === "no_ball") extras.noBalls -= 1;
  if (ball.extra === "bye") extras.byes -= ball.runs;
  if (ball.extra === "leg_bye") extras.legByes -= ball.runs;
  if (ball.extra === "penalty") extras.penalty -= ball.runs;

  const totalDeliveries = totalBalls(newOvers, newBalls);
  const newRuns = innings.runs - ball.runs;
  const runRate = totalDeliveries > 0 ? (newRuns / totalDeliveries) * 6 : 0;

  return {
    runs: newRuns,
    wickets: innings.wickets - (ball.isWicket ? 1 : 0),
    overs: newOvers,
    balls: newBalls,
    extras,
    runRate: Math.round(runRate * 100) / 100,
    completed: false,
  };
}

export function calculateWinProbability(
  currentRuns: number,
  wickets: number,
  overs: number,
  balls: number,
  target: number,
  maxOvers: number
): number {
  const ballsRemaining = maxOvers * 6 - totalBalls(overs, balls);
  const runsNeeded = target - currentRuns;
  if (runsNeeded <= 0) return 95;
  if (ballsRemaining <= 0) return 5;
  if (wickets >= 9) return 15;

  const requiredRR = (runsNeeded / ballsRemaining) * 6;
  const currentRR =
    totalBalls(overs, balls) > 0
      ? (currentRuns / totalBalls(overs, balls)) * 6
      : 6;

  const rrDiff = currentRR - requiredRR;
  let prob = 50 + rrDiff * 8 - wickets * 4;
  prob = Math.max(5, Math.min(95, prob));
  return Math.round(prob);
}

export function calculateProjectedScore(
  runs: number,
  overs: number,
  balls: number,
  maxOvers: number
): number {
  const delivered = totalBalls(overs, balls);
  if (delivered === 0) return 0;
  const rr = (runs / delivered) * 6;
  return Math.round(rr * maxOvers);
}
