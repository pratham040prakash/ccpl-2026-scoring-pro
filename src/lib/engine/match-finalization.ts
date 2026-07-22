import type { Ball, Innings, Match, MatchResult, PlayerStats } from "@/types";
import type { StoredMatchScore } from "@/types/scores";
import {
  aggregateBatterScores,
  aggregateBowlerScores,
  calculateMvpPoints,
  getPlayerOfMatch,
} from "./statistics";

export function computeMatchResult(
  match: Match,
  inningsList: Innings[]
): { result: MatchResult; winnerId: string; loserId: string } {
  const inn1 = inningsList.find((i) => i.inningsNumber === 1);
  const inn2 = inningsList.find((i) => i.inningsNumber === 2);

  if (!inn1 || !inn2) {
    throw new Error("Both innings required to compute result");
  }

  const teamAInnings = inn1.teamId === match.teamAId ? inn1 : inn2;
  const target = match.target ?? teamAInnings.runs + 1;

  let winnerId: string;
  let loserId: string;
  let margin: string;
  let marginType: "runs" | "wickets";

  const chaseInnings = inn2;
  const firstInnings = inn1;

  if (chaseInnings.runs >= target) {
    winnerId = chaseInnings.teamId;
    loserId = firstInnings.teamId;
    const wicketsLeft = 10 - chaseInnings.wickets;
    margin = `${wicketsLeft} wicket${wicketsLeft !== 1 ? "s" : ""}`;
    marginType = "wickets";
  } else if (firstInnings.runs > chaseInnings.runs) {
    winnerId = firstInnings.teamId;
    loserId = chaseInnings.teamId;
    margin = `${firstInnings.runs - chaseInnings.runs} runs`;
    marginType = "runs";
  } else if (chaseInnings.runs > firstInnings.runs) {
    winnerId = chaseInnings.teamId;
    loserId = firstInnings.teamId;
    margin = `${chaseInnings.runs - firstInnings.runs} runs`;
    marginType = "runs";
  } else {
    winnerId = match.teamAId;
    loserId = match.teamBId;
    margin = "Tie";
    marginType = "runs";
  }

  const winnerName =
    winnerId === match.teamAId ? match.teamAName : match.teamBName;

  return {
    winnerId,
    loserId,
    result: {
      winnerId,
      winnerName,
      margin,
      marginType,
      summary: `${winnerName} won by ${margin}`,
    },
  };
}

export function buildStoredScoreFromLive(
  match: Match,
  inningsList: Innings[]
): StoredMatchScore | null {
  const inn1 = inningsList.find((i) => i.inningsNumber === 1);
  const inn2 = inningsList.find((i) => i.inningsNumber === 2);
  if (!inn1 || !inn2) return null;

  const teamAInnings = inn1.teamId === match.teamAId ? inn1 : inn2;
  const teamBInnings = inn1.teamId === match.teamBId ? inn1 : inn2;
  const { result, winnerId } = computeMatchResult(match, inningsList);

  return {
    fixtureId: match.fixtureId,
    matchId: match.matchId,
    teamAId: match.teamAId,
    teamBId: match.teamBId,
    teamAName: match.teamAName,
    teamBName: match.teamBName,
    teamARuns: teamAInnings.runs,
    teamAWickets: teamAInnings.wickets,
    teamAOvers: teamAInnings.overs,
    teamABalls: teamAInnings.balls,
    teamBRuns: teamBInnings.runs,
    teamBWickets: teamBInnings.wickets,
    teamBOvers: teamBInnings.overs,
    teamBBalls: teamBInnings.balls,
    winnerName: result.winnerName,
    winnerId,
    margin: result.margin,
    marginType: result.marginType,
    status: "published",
    source: "live",
    updatedAt: new Date().toISOString(),
  };
}

export function aggregatePlayerStatsFromBalls(
  balls: Ball[],
  teamNameByPlayer: Map<string, { teamId: string; teamName: string }>
): (PlayerStats & { playerId: string; playerName: string; teamId: string; teamName: string })[] {
  const byMatch = new Map<string, Ball[]>();
  for (const ball of balls) {
    const list = byMatch.get(ball.matchId) ?? [];
    list.push(ball);
    byMatch.set(ball.matchId, list);
  }

  const statsMap = new Map<
    string,
    PlayerStats & { playerId: string; playerName: string; teamId: string; teamName: string }
  >();

  function ensure(playerId: string, playerName: string) {
    if (!statsMap.has(playerId)) {
      const team = teamNameByPlayer.get(playerId) ?? {
        teamId: "",
        teamName: "",
      };
      statsMap.set(playerId, {
        playerId,
        playerName,
        teamId: team.teamId,
        teamName: team.teamName,
        matches: 0,
        innings: 0,
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        strikeRate: 0,
        highestScore: 0,
        fifties: 0,
        hundreds: 0,
        wickets: 0,
        ballsBowled: 0,
        runsConceded: 0,
        economy: 0,
        average: 0,
        bestBowling: "-",
        catches: 0,
        runOuts: 0,
        mvpPoints: 0,
      });
    }
    return statsMap.get(playerId)!;
  }

  for (const [, matchBalls] of byMatch) {
    const batters = aggregateBatterScores(matchBalls);
    const bowlers = aggregateBowlerScores(matchBalls);
    const seenBat = new Set<string>();
    const seenBowl = new Set<string>();

    for (const b of batters) {
      const s = ensure(b.playerId, b.playerName);
      s.runs += b.runs;
      s.balls += b.balls;
      s.fours += b.fours;
      s.sixes += b.sixes;
      s.highestScore = Math.max(s.highestScore, b.runs);
      if (b.runs >= 50) s.fifties++;
      if (b.runs >= 100) s.hundreds++;
      if (!seenBat.has(b.playerId)) {
        s.innings++;
        seenBat.add(b.playerId);
      }
    }

    for (const b of bowlers) {
      const s = ensure(b.playerId, b.playerName);
      s.wickets += b.wickets;
      s.ballsBowled += b.balls;
      s.runsConceded += b.runs;
      if (!seenBowl.has(b.playerId)) {
        seenBowl.add(b.playerId);
      }
    }

    for (const ball of matchBalls) {
      if (ball.isWicket && ball.dismissal === "caught" && ball.fielderId) {
        const fielder = matchBalls.find((x) => x.bowlerId === ball.fielderId);
        const name = fielder?.bowlerName ?? ball.fielderId;
        ensure(ball.fielderId, name).catches++;
      }
      if (ball.isWicket && ball.dismissal === "run_out" && ball.fielderId) {
        ensure(ball.fielderId, ball.fielderId).runOuts++;
      }
    }

    for (const id of new Set([...seenBat, ...seenBowl])) {
      ensure(id, id).matches++;
    }
  }

  return Array.from(statsMap.values()).map((s) => {
    s.strikeRate = s.balls > 0 ? Math.round((s.runs / s.balls) * 1000) / 10 : 0;
    s.economy =
      s.ballsBowled > 0
        ? Math.round((s.runsConceded / s.ballsBowled) * 60 * 10) / 10
        : 0;
    s.mvpPoints = calculateMvpPoints(s);
    return s;
  });
}

export function resolvePlayerOfMatchFromBalls(allBalls: Ball[]): {
  playerId: string;
  playerName: string;
  reason: string;
} | null {
  const batters = aggregateBatterScores(allBalls);
  const bowlers = aggregateBowlerScores(allBalls);
  return getPlayerOfMatch(batters, bowlers);
}

export function generateMatchSummary(
  match: Match,
  inningsList: Innings[],
  mom: { playerName: string; reason: string } | null
): string {
  const inn1 = inningsList.find((i) => i.inningsNumber === 1);
  const inn2 = inningsList.find((i) => i.inningsNumber === 2);
  if (!inn1 || !inn2) return "";

  const { result } = computeMatchResult(match, inningsList);
  const momLine = mom ? ` Player of the Match: ${mom.playerName} (${mom.reason}).` : "";
  return (
    `${match.teamAName} vs ${match.teamBName} at ${match.ground}. ` +
    `${inn1.teamName} ${inn1.runs}/${inn1.wickets} (${formatInningsOvers(inn1)}). ` +
    `${inn2.teamName} ${inn2.runs}/${inn2.wickets} (${formatInningsOvers(inn2)}). ` +
    `${result.summary}.${momLine}`
  );
}

function formatInningsOvers(inn: Innings): string {
  return `${inn.overs}.${inn.balls} ov`;
}
