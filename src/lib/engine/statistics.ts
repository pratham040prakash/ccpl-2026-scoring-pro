import type { Ball, BatterScore, BowlerScore, Innings, PlayerStats } from "@/types";
import { economy, strikeRate } from "@/lib/utils";

export function aggregateBatterScores(balls: Ball[]): BatterScore[] {
  const map = new Map<string, BatterScore>();

  for (const ball of balls) {
    if (ball.batsmanRuns > 0 || ball.isWicket) {
      const existing = map.get(ball.strikerId) || {
        playerId: ball.strikerId,
        playerName: ball.strikerName,
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        strikeRate: 0,
        isOut: false,
      };

      if (ball.isLegalDelivery) existing.balls++;
      existing.runs += ball.batsmanRuns;
      if (ball.batsmanRuns === 4) existing.fours++;
      if (ball.batsmanRuns === 6) existing.sixes++;
      existing.strikeRate = strikeRate(existing.runs, existing.balls);

      if (ball.isWicket && ball.dismissedPlayerId === ball.strikerId) {
        existing.isOut = true;
        existing.dismissal = ball.dismissal;
      }

      map.set(ball.strikerId, existing);
    }
  }

  return Array.from(map.values()).sort((a, b) => b.runs - a.runs);
}

export function aggregateBowlerScores(balls: Ball[]): BowlerScore[] {
  const map = new Map<string, BowlerScore>();

  for (const ball of balls) {
    const existing = map.get(ball.bowlerId) || {
      playerId: ball.bowlerId,
      playerName: ball.bowlerName,
      overs: 0,
      balls: 0,
      maidens: 0,
      runs: 0,
      wickets: 0,
      economy: 0,
    };

    existing.runs += ball.runs;
    if (ball.isLegalDelivery) existing.balls++;
    if (ball.isWicket && ball.dismissal !== "run_out") existing.wickets++;
    existing.overs = Math.floor(existing.balls / 6);
    existing.economy = economy(existing.runs, existing.balls);

    map.set(ball.bowlerId, existing);
  }

  return Array.from(map.values()).sort((a, b) => b.wickets - a.wickets || a.economy - b.economy);
}

export function calculateLeaderboards(
  allPlayerStats: (PlayerStats & { playerId: string; playerName: string; teamName: string; teamId: string })[]
) {
  const sortDesc = (key: keyof PlayerStats) =>
    [...allPlayerStats]
      .sort((a, b) => (b[key] as number) - (a[key] as number))
      .map((p, i) => ({
        playerId: p.playerId,
        playerName: p.playerName,
        teamId: p.teamId,
        teamName: p.teamName,
        value: p[key] as number,
        rank: i + 1,
      }));

  return {
    orangeCap: sortDesc("runs").slice(0, 10),
    purpleCap: sortDesc("wickets").slice(0, 10),
    mostSixes: sortDesc("sixes").slice(0, 10),
    mostFours: sortDesc("fours").slice(0, 10),
    bestStrikeRate: [...allPlayerStats]
      .filter((p) => p.balls >= 20)
      .sort((a, b) => b.strikeRate - a.strikeRate)
      .slice(0, 10)
      .map((p, i) => ({
        playerId: p.playerId,
        playerName: p.playerName,
        teamId: p.teamId,
        teamName: p.teamName,
        value: p.strikeRate,
        rank: i + 1,
      })),
    bestEconomy: [...allPlayerStats]
      .filter((p) => p.ballsBowled >= 12)
      .sort((a, b) => a.economy - b.economy)
      .slice(0, 10)
      .map((p, i) => ({
        playerId: p.playerId,
        playerName: p.playerName,
        teamId: p.teamId,
        teamName: p.teamName,
        value: p.economy,
        rank: i + 1,
      })),
    mvp: sortDesc("mvpPoints").slice(0, 10),
    mostCatches: sortDesc("catches").slice(0, 10),
    mostRunOuts: sortDesc("runOuts").slice(0, 10),
  };
}

export function calculateMvpPoints(stats: PlayerStats): number {
  return (
    stats.runs * 1 +
    stats.wickets * 25 +
    stats.catches * 8 +
    stats.runOuts * 12 +
    stats.fifties * 10 +
    stats.hundreds * 25
  );
}

export function buildWormData(balls: Ball[], maxOvers: number) {
  const data: { over: number; runs: number; wickets: number }[] = [];
  let cumulative = 0;
  let wickets = 0;

  for (let over = 0; over <= maxOvers; over++) {
    const overBalls = balls.filter((b) => b.overNumber === over && b.isLegalDelivery);
    for (const ball of overBalls) {
      cumulative += ball.runs;
      if (ball.isWicket) wickets++;
    }
    data.push({ over, runs: cumulative, wickets });
  }

  return data;
}

export function buildRunRateData(balls: Ball[], maxOvers: number) {
  const data: { over: number; runRate: number }[] = [];
  let cumulative = 0;
  let legalBalls = 0;

  for (let over = 0; over <= maxOvers; over++) {
    const overBalls = balls.filter((b) => b.overNumber <= over && b.isLegalDelivery);
    cumulative = overBalls.reduce((s, b) => s + b.runs, 0);
    legalBalls = overBalls.length;
    const rr = legalBalls > 0 ? (cumulative / legalBalls) * 6 : 0;
    data.push({ over, runRate: Math.round(rr * 100) / 100 });
  }

  return data;
}

export function getPlayerOfMatch(
  batters: BatterScore[],
  bowlers: BowlerScore[]
): { playerId: string; playerName: string; reason: string } | null {
  let best: { playerId: string; playerName: string; score: number; reason: string } | null = null;

  for (const b of batters) {
    const score = b.runs + b.fours * 2 + b.sixes * 4 + (b.runs >= 50 ? 20 : 0);
    if (!best || score > best.score) {
      best = {
        playerId: b.playerId,
        playerName: b.playerName,
        score,
        reason: `${b.runs} runs (${b.balls} balls)`,
      };
    }
  }

  for (const b of bowlers) {
    const score = b.wickets * 25 + (5 - b.economy) * 5;
    if (!best || score > best.score) {
      best = {
        playerId: b.playerId,
        playerName: b.playerName,
        score,
        reason: `${b.wickets}/${b.runs} in ${Math.floor(b.balls / 6)}.${b.balls % 6} overs`,
      };
    }
  }

  return best
    ? { playerId: best.playerId, playerName: best.playerName, reason: best.reason }
    : null;
}
