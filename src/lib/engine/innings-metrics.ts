import type { Ball, Innings, Match, Partnership } from "@/types";
import {
  calculateRequiredRunRate,
  calculateRunRate,
  totalBalls,
} from "@/lib/utils";
import {
  calculateProjectedScore,
  calculateWinProbability,
} from "./scoring";
import { aggregateBatterScores } from "./statistics";

export function formatOverLabel(overs: number, balls: number): string {
  return `${overs}.${balls}`;
}

export function computePartnership(
  balls: Ball[],
  strikerId: string,
  nonStrikerId: string
): Partnership {
  const sinceWicket = getBallsSinceLastWicket(balls);
  let runs = 0;
  let legalBalls = 0;
  let batsman1Runs = 0;
  let batsman2Runs = 0;

  for (const ball of sinceWicket) {
    runs += ball.runs;
    if (ball.isLegalDelivery) legalBalls++;
    if (ball.strikerId === strikerId) batsman1Runs += ball.batsmanRuns;
    else if (ball.strikerId === nonStrikerId) batsman2Runs += ball.batsmanRuns;
  }

  return {
    runs,
    balls: legalBalls,
    batsman1Id: strikerId,
    batsman2Id: nonStrikerId,
    batsman1Runs,
    batsman2Runs,
  };
}

function getBallsSinceLastWicket(balls: Ball[]): Ball[] {
  const lastWicketIdx = [...balls].reverse().findIndex((b) => b.isWicket);
  if (lastWicketIdx === -1) return balls;
  return balls.slice(balls.length - lastWicketIdx);
}

export function computeLastWicket(balls: Ball[]): Innings["lastWicket"] | undefined {
  const wicketBall = [...balls].reverse().find((b) => b.isWicket);
  if (!wicketBall?.dismissedPlayerId) return undefined;
  const batters = aggregateBatterScores(balls);
  const out = batters.find((b) => b.playerId === wicketBall.dismissedPlayerId);
  return {
    playerId: wicketBall.dismissedPlayerId,
    playerName: out?.playerName ?? wicketBall.strikerName,
    runs: out?.runs ?? 0,
    balls: out?.balls ?? 0,
    over: wicketBall.overNumber,
    dismissal: wicketBall.dismissal ?? "bowled",
  };
}

export function rotateStrike(
  strikerId: string,
  nonStrikerId: string,
  shouldRotate: boolean
): { strikerId: string; nonStrikerId: string } {
  if (!shouldRotate) return { strikerId, nonStrikerId };
  return { strikerId: nonStrikerId, nonStrikerId: strikerId };
}

export function enrichInningsFromBalls(
  innings: Innings,
  match: Match,
  balls: Ball[]
): Partial<Innings> {
  const strikerId = innings.strikerId ?? "";
  const nonStrikerId = innings.nonStrikerId ?? "";
  const partnership = computePartnership(balls, strikerId, nonStrikerId);
  const lastWicket = computeLastWicket(balls);

  const patch: Partial<Innings> = {
    partnership,
    lastWicket,
    updatedAt: new Date().toISOString(),
  };

  if (innings.inningsNumber === 2 && match.target) {
    patch.requiredRunRate = Math.round(
      calculateRequiredRunRate(
        match.target,
        innings.runs,
        match.overs,
        innings.overs,
        innings.balls
      ) * 100
    ) / 100;
    patch.winProbability = calculateWinProbability(
      innings.runs,
      innings.wickets,
      innings.overs,
      innings.balls,
      match.target,
      match.overs
    );
  }

  patch.projectedScore = Math.round(
    calculateProjectedScore(
      innings.runs,
      innings.overs,
      innings.balls,
      match.overs
    )
  );
  patch.runRate = Math.round(
    calculateRunRate(innings.runs, innings.overs, innings.balls) * 100
  ) / 100;

  return patch;
}

export function ballsRemaining(match: Match, innings: Innings): number {
  return Math.max(0, match.overs * 6 - totalBalls(innings.overs, innings.balls));
}

export function runsNeeded(match: Match, innings: Innings): number | undefined {
  if (!match.target || innings.inningsNumber !== 2) return undefined;
  return Math.max(0, match.target - innings.runs);
}

export function isPowerplay(innings: Innings, maxOvers = 6): boolean {
  return totalBalls(innings.overs, innings.balls) < maxOvers * 6 &&
    innings.overs < maxOvers;
}
