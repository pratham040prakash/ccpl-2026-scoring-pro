import type { Ball, Innings, Match, Player } from "@/types";
import {
  aggregateBatterScores,
  aggregateBowlerScores,
  buildRunRateData,
  buildWormData,
  getPlayerOfMatch,
} from "@/lib/engine/statistics";
import { calculateRunRate, economy, formatOvers, strikeRate, totalBalls } from "@/lib/utils";

export type BatterStatus = "out" | "not_out" | "did_not_bat" | "retired_hurt" | "absent_hurt";

export interface ScorecardBatterRow {
  playerId: string;
  playerName: string;
  photoUrl?: string;
  dismissal: string;
  runs: number;
  balls: number;
  minutes: number;
  fours: number;
  sixes: number;
  dotBalls: number;
  strikeRate: number;
  boundaryPct: number;
  isOut: boolean;
  isCaptain: boolean;
  isWicketKeeper: boolean;
  isAtCrease: boolean;
  battingPosition: number | null;
  status: BatterStatus;
}

export interface ScorecardBowlerRow {
  playerId: string;
  playerName: string;
  overs: string;
  maidens: number;
  runs: number;
  wickets: number;
  economy: number;
  dotBalls: number;
  wides: number;
  noBalls: number;
  average: number;
  bowlingStrikeRate: number;
  bestBowling: string;
  isCurrentBowler: boolean;
}

export interface FallOfWicketRow {
  wicketNumber: number;
  score: string;
  batter: string;
  over: string;
  dismissal: string;
}

export interface PartnershipRow {
  wicketNumber: number;
  runs: number;
  balls: number;
  player1: string;
  player2: string;
  player1Runs: number;
  player2Runs: number;
  durationMinutes: number;
}

export interface OverSummaryRow {
  overNumber: number;
  balls: string[];
  runs: number;
  wickets: number;
}

export interface RunDistribution {
  singles: number;
  doubles: number;
  triples: number;
  fours: number;
  sixes: number;
  extras: number;
  dots: number;
}

export interface InningsAnalytics {
  hasBallByBall: boolean;
  batters: ScorecardBatterRow[];
  bowlers: ScorecardBowlerRow[];
  fallOfWickets: FallOfWicketRow[];
  partnerships: PartnershipRow[];
  overs: OverSummaryRow[];
  runDistribution: RunDistribution;
  wormData: { over: number; runs: number; wickets: number }[];
  runRateData: { over: number; runRate: number }[];
  manhattanData: { over: number; runs: number }[];
  bowlingEconomyTrend: { over: number; economy: number }[];
  dotBallPct: number;
  boundaryPct: number;
  powerplayRuns: number;
  deathOversRuns: number;
}

export interface MatchAnalytics {
  highestPartnership: PartnershipRow | null;
  mostSixes: { name: string; count: number } | null;
  mostFours: { name: string; count: number } | null;
  bestBowler: { name: string; figures: string } | null;
  bestBatter: { name: string; runs: number; balls: number } | null;
  totalDotBalls: number;
  boundaryPct: number;
  playerOfMatch: ReturnType<typeof getPlayerOfMatch>;
}

const DISMISSAL_LABELS: Record<string, string> = {
  bowled: "Bowled",
  caught: "Caught",
  lbw: "LBW",
  run_out: "Run Out",
  stumped: "Stumped",
  hit_wicket: "Hit Wicket",
  retired_hurt: "Retired Hurt",
  timed_out: "Timed Out",
  obstructing_field: "Obstructing Field",
};

export function stageLabel(stage: Match["stage"]): string {
  const labels: Record<Match["stage"], string> = {
    round_1: "League",
    integration: "Round 2",
    quarter_final: "Quarter Final",
    semi_final: "Semi Final",
    final: "Final",
  };
  return labels[stage] ?? stage;
}

export function formatDismissalText(ball: Ball): string {
  const bowler = ball.bowlerName;
  switch (ball.dismissal) {
    case "bowled":
      return `b ${bowler}`;
    case "caught":
      return `c ${ball.fielderId ? "fielder" : "fielder"} b ${bowler}`;
    case "lbw":
      return `lbw b ${bowler}`;
    case "run_out":
      return "run out";
    case "stumped":
      return `st ${ball.fielderId ? "keeper" : "keeper"} b ${bowler}`;
    case "hit_wicket":
      return `hit wicket b ${bowler}`;
    case "retired_hurt":
      return "retired hurt";
    case "timed_out":
      return "timed out";
    case "obstructing_field":
      return "obstructing the field";
    default:
      return DISMISSAL_LABELS[ball.dismissal ?? ""] ?? ball.dismissal ?? "out";
  }
}

function minutesBetween(start: string, end: string): number {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(0, Math.round(ms / 60000));
}

function playingXiForTeam(match: Match, teamId: string): string[] {
  return teamId === match.teamAId ? match.playingXiA : match.playingXiB;
}

function teamMetaForTeam(match: Match, teamId: string) {
  return teamId === match.teamAId ? match.teamAMeta : match.teamBMeta;
}

function ballLabel(ball: Ball): string {
  if (ball.isWicket) return "W";
  if (ball.extra === "wide") return ball.runs > 1 ? `${ball.runs}Wd` : "Wd";
  if (ball.extra === "no_ball") return ball.runs > 1 ? `${ball.runs}Nb` : "Nb";
  if (ball.extra === "bye") return `${ball.runs}B`;
  if (ball.extra === "leg_bye") return `${ball.runs}Lb`;
  if (ball.batsmanRuns === 0 && ball.isLegalDelivery) return "•";
  return String(ball.runs);
}

export function buildInningsAnalytics(
  balls: Ball[],
  innings: Innings,
  match: Match,
  players: Player[] = [],
  maxOvers = 20
): InningsAnalytics {
  const sorted = [...balls].sort((a, b) => a.sequence - b.sequence);
  const hasBallByBall = sorted.length > 0;
  const playerMap = new Map(players.map((p) => [p.id, p]));
  const meta = teamMetaForTeam(match, innings.teamId);
  const playingXi = playingXiForTeam(match, innings.teamId);

  const batterAgg = aggregateBatterScores(sorted);
  const bowlerAgg = aggregateBowlerScores(sorted);

  const firstSeen = new Map<string, number>();
  const firstBallAt = new Map<string, string>();
  const lastBallAt = new Map<string, string>();
  const dotBalls = new Map<string, number>();
  const dismissals = new Map<string, string>();
  let position = 0;

  for (const ball of sorted) {
    for (const id of [ball.strikerId, ball.nonStrikerId]) {
      if (!firstSeen.has(id)) {
        position += 1;
        firstSeen.set(id, position);
        firstBallAt.set(id, ball.timestamp);
      }
      lastBallAt.set(id, ball.timestamp);
    }

    if (ball.isLegalDelivery && ball.batsmanRuns === 0 && !ball.isWicket) {
      dotBalls.set(ball.strikerId, (dotBalls.get(ball.strikerId) ?? 0) + 1);
    }

    if (ball.isWicket && ball.dismissedPlayerId) {
      dismissals.set(ball.dismissedPlayerId, formatDismissalText(ball));
    }
  }

  const batters: ScorecardBatterRow[] = batterAgg.map((b) => {
    const player = playerMap.get(b.playerId);
    const boundaries = b.fours + b.sixes;
    const boundaryPct =
      b.balls > 0 ? Math.round((boundaries / b.balls) * 1000) / 10 : 0;
    const start = firstBallAt.get(b.playerId);
    const end = lastBallAt.get(b.playerId);
    const minutes = start && end ? minutesBetween(start, end) : 0;
    let status: BatterStatus = b.isOut ? "out" : "not_out";
    if (b.dismissal === "retired_hurt") status = "retired_hurt";

    return {
      playerId: b.playerId,
      playerName: b.playerName,
      photoUrl: player?.photoUrl,
      dismissal: dismissals.get(b.playerId) ?? (b.isOut ? String(b.dismissal ?? "out") : "Not Out"),
      runs: b.runs,
      balls: b.balls,
      minutes,
      fours: b.fours,
      sixes: b.sixes,
      dotBalls: dotBalls.get(b.playerId) ?? 0,
      strikeRate: b.strikeRate,
      boundaryPct,
      isOut: b.isOut,
      isCaptain: meta?.captainId === b.playerId,
      isWicketKeeper: meta?.wicketKeeperId === b.playerId,
      isAtCrease:
        innings.strikerId === b.playerId || innings.nonStrikerId === b.playerId,
      battingPosition: firstSeen.get(b.playerId) ?? null,
      status,
    };
  });

  const battedIds = new Set(batters.map((b) => b.playerId));
  for (const playerId of playingXi) {
    if (battedIds.has(playerId)) continue;
    const player = playerMap.get(playerId);
    batters.push({
      playerId,
      playerName: player?.name ?? playerId,
      photoUrl: player?.photoUrl,
      dismissal: "Did Not Bat",
      runs: 0,
      balls: 0,
      minutes: 0,
      fours: 0,
      sixes: 0,
      dotBalls: 0,
      strikeRate: 0,
      boundaryPct: 0,
      isOut: false,
      isCaptain: meta?.captainId === playerId,
      isWicketKeeper: meta?.wicketKeeperId === playerId,
      isAtCrease: false,
      battingPosition: null,
      status: "did_not_bat",
    });
  }

  batters.sort((a, b) => {
    if (a.battingPosition && b.battingPosition) return a.battingPosition - b.battingPosition;
    if (a.battingPosition) return -1;
    if (b.battingPosition) return 1;
    if (a.status === "did_not_bat") return 1;
    if (b.status === "did_not_bat") return -1;
    return b.runs - a.runs;
  });

  const bowlerExtras = new Map<string, { wides: number; noBalls: number; dots: number }>();
  const overRunsByBowler = new Map<string, Map<number, number>>();

  for (const ball of sorted) {
    const extra = bowlerExtras.get(ball.bowlerId) ?? { wides: 0, noBalls: 0, dots: 0 };
    if (ball.extra === "wide") extra.wides += 1;
    if (ball.extra === "no_ball") extra.noBalls += 1;
    if (ball.isLegalDelivery && ball.runs === 0) extra.dots += 1;
    bowlerExtras.set(ball.bowlerId, extra);

    const oversMap = overRunsByBowler.get(ball.bowlerId) ?? new Map();
    oversMap.set(ball.overNumber, (oversMap.get(ball.overNumber) ?? 0) + ball.runs);
    overRunsByBowler.set(ball.bowlerId, oversMap);
  }

  const bowlers: ScorecardBowlerRow[] = bowlerAgg.map((b) => {
    const extras = bowlerExtras.get(b.playerId) ?? { wides: 0, noBalls: 0, dots: 0 };
    const oversMap = overRunsByBowler.get(b.playerId) ?? new Map();
    let maidens = 0;
    for (const [, runs] of oversMap) {
      if (runs === 0) maidens += 1;
    }
    const avg = b.wickets > 0 ? Math.round((b.runs / b.wickets) * 10) / 10 : 0;
    const bsr = b.wickets > 0 ? Math.round((b.balls / b.wickets) * 10) / 10 : 0;

    return {
      playerId: b.playerId,
      playerName: b.playerName,
      overs: formatOvers(Math.floor(b.balls / 6), b.balls % 6),
      maidens,
      runs: b.runs,
      wickets: b.wickets,
      economy: b.economy,
      dotBalls: extras.dots,
      wides: extras.wides,
      noBalls: extras.noBalls,
      average: avg,
      bowlingStrikeRate: bsr,
      bestBowling: `${b.wickets}/${b.runs}`,
      isCurrentBowler: innings.bowlerId === b.playerId,
    };
  });

  let cumulative = 0;
  const fallOfWickets: FallOfWicketRow[] = [];
  sorted
    .filter((b) => b.isWicket)
    .forEach((ball, index) => {
      cumulative += ball.runs;
      const dismissedName =
        ball.dismissedPlayerId === ball.strikerId
          ? ball.strikerName
          : ball.dismissedPlayerId === ball.nonStrikerId
            ? ball.nonStrikerName
            : ball.strikerName;
      fallOfWickets.push({
        wicketNumber: index + 1,
        score: `${index + 1}-${cumulative}`,
        batter: dismissedName,
        over: `${ball.overNumber}.${ball.ballNumber}`,
        dismissal: DISMISSAL_LABELS[ball.dismissal ?? ""] ?? formatDismissalText(ball),
      });
    });

  const partnerships: PartnershipRow[] = [];
  let partnershipRuns = 0;
  let partnershipBalls = 0;
  let p1 = sorted[0]?.strikerName ?? "";
  let p2 = sorted[0]?.nonStrikerName ?? "";
  let p1Runs = 0;
  let p2Runs = 0;
  let partnershipStart = sorted[0]?.timestamp;
  let wicketNum = 0;

  for (const ball of sorted) {
    partnershipRuns += ball.runs;
    if (ball.isLegalDelivery) partnershipBalls += 1;
    if (ball.strikerId === sorted.find((b) => b.strikerName === p1)?.strikerId) {
      p1Runs += ball.batsmanRuns;
    } else {
      p2Runs += ball.batsmanRuns;
    }

    if (ball.isWicket) {
      wicketNum += 1;
      partnerships.push({
        wicketNumber: wicketNum,
        runs: partnershipRuns,
        balls: partnershipBalls,
        player1: p1,
        player2: p2,
        player1Runs: p1Runs,
        player2Runs: p2Runs,
        durationMinutes:
          partnershipStart && ball.timestamp
            ? minutesBetween(partnershipStart, ball.timestamp)
            : 0,
      });
      partnershipRuns = 0;
      partnershipBalls = 0;
      p1Runs = 0;
      p2Runs = 0;
      partnershipStart = ball.timestamp;
      p1 = ball.strikerName;
      p2 = ball.nonStrikerName;
    }
  }

  if (partnershipBalls > 0) {
    partnerships.push({
      wicketNumber: wicketNum + 1,
      runs: partnershipRuns,
      balls: partnershipBalls,
      player1: p1,
      player2: p2,
      player1Runs: p1Runs,
      player2Runs: p2Runs,
      durationMinutes:
        partnershipStart && sorted.at(-1)?.timestamp
          ? minutesBetween(partnershipStart, sorted.at(-1)!.timestamp)
          : 0,
    });
  }

  const oversMap = new Map<number, Ball[]>();
  for (const ball of sorted) {
    const list = oversMap.get(ball.overNumber) ?? [];
    list.push(ball);
    oversMap.set(ball.overNumber, list);
  }

  const overs: OverSummaryRow[] = [...oversMap.entries()]
    .sort(([a], [b]) => a - b)
    .map(([overNumber, overBalls]) => ({
      overNumber,
      balls: overBalls.map(ballLabel),
      runs: overBalls.reduce((s, b) => s + b.runs, 0),
      wickets: overBalls.filter((b) => b.isWicket).length,
    }));

  const runDistribution: RunDistribution = {
    singles: 0,
    doubles: 0,
    triples: 0,
    fours: 0,
    sixes: 0,
    extras: 0,
    dots: 0,
  };

  for (const ball of sorted) {
    if (!ball.isLegalDelivery || ball.extra) {
      if (ball.extra && ball.extra !== "bye" && ball.extra !== "leg_bye") {
        runDistribution.extras += ball.runs;
      }
      continue;
    }
    if (ball.batsmanRuns === 0 && !ball.isWicket) runDistribution.dots += 1;
    if (ball.batsmanRuns === 1) runDistribution.singles += 1;
    if (ball.batsmanRuns === 2) runDistribution.doubles += 1;
    if (ball.batsmanRuns === 3) runDistribution.triples += 1;
    if (ball.batsmanRuns === 4) runDistribution.fours += 1;
    if (ball.batsmanRuns === 6) runDistribution.sixes += 1;
  }

  const powerplayOvers = match.matchSettings?.powerplayOvers ?? 6;
  const deathStartOver = Math.max(0, maxOvers - 4);
  let powerplayRuns = 0;
  let deathOversRuns = 0;
  for (const row of overs) {
    if (row.overNumber < powerplayOvers) powerplayRuns += row.runs;
    if (row.overNumber >= deathStartOver) deathOversRuns += row.runs;
  }

  const legalBalls = sorted.filter((b) => b.isLegalDelivery).length;
  const totalBoundaries = runDistribution.fours + runDistribution.sixes;
  const boundaryPct =
    legalBalls > 0 ? Math.round((totalBoundaries / legalBalls) * 1000) / 10 : 0;
  const dotBallPct =
    legalBalls > 0 ? Math.round((runDistribution.dots / legalBalls) * 1000) / 10 : 0;

  const manhattanData = overs.map((o) => ({ over: o.overNumber + 1, runs: o.runs }));

  const bowlingEconomyTrend: { over: number; economy: number }[] = [];
  let bowlRuns = 0;
  let bowlBalls = 0;
  for (const row of overs) {
    bowlRuns += row.runs;
    bowlBalls += row.balls.filter((b) => b !== "Wd" && !b.endsWith("Nb")).length;
    bowlingEconomyTrend.push({
      over: row.overNumber + 1,
      economy: economy(bowlRuns, bowlBalls),
    });
  }

  return {
    hasBallByBall,
    batters,
    bowlers,
    fallOfWickets,
    partnerships,
    overs,
    runDistribution,
    wormData: buildWormData(sorted, maxOvers),
    runRateData: buildRunRateData(sorted, maxOvers),
    manhattanData,
    bowlingEconomyTrend,
    dotBallPct,
    boundaryPct,
    powerplayRuns,
    deathOversRuns,
  };
}

export function buildMatchAnalytics(
  allBalls: Ball[],
  inningsList: Innings[],
  match: Match
): MatchAnalytics {
  const batters = aggregateBatterScores(allBalls);
  const bowlers = aggregateBowlerScores(allBalls);

  const partnerships = inningsList.flatMap((inn) =>
    buildInningsAnalytics(allBalls.filter((b) => b.inningsId === inn.id), inn, match).partnerships
  );

  const highestPartnership =
    partnerships.length > 0
      ? partnerships.reduce((best, p) => (p.runs > best.runs ? p : best))
      : null;

  const mostSixes =
    batters.length > 0
      ? batters.reduce((best, b) => (b.sixes > best.count ? { name: b.playerName, count: b.sixes } : best), {
          name: batters[0].playerName,
          count: batters[0].sixes,
        })
      : null;

  const mostFours =
    batters.length > 0
      ? batters.reduce((best, b) => (b.fours > best.count ? { name: b.playerName, count: b.fours } : best), {
          name: batters[0].playerName,
          count: batters[0].fours,
        })
      : null;

  const bestBowler =
    bowlers.length > 0
      ? bowlers.reduce(
          (best, b) =>
            b.wickets > best.wickets || (b.wickets === best.wickets && b.economy < best.economy)
              ? b
              : best,
          bowlers[0]
        )
      : null;

  const bestBatter =
    batters.length > 0
      ? batters.reduce((best, b) => (b.runs > best.runs ? b : best), batters[0])
      : null;

  const legalBalls = allBalls.filter((b) => b.isLegalDelivery).length;
  const dots = allBalls.filter(
    (b) => b.isLegalDelivery && b.batsmanRuns === 0 && !b.isWicket
  ).length;
  const boundaries = batters.reduce((s, b) => s + b.fours + b.sixes, 0);

  let playerOfMatch = getPlayerOfMatch(batters, bowlers);
  if (match.playerOfMatchId) {
    const fromBat = batters.find((b) => b.playerId === match.playerOfMatchId);
    const fromBowl = bowlers.find((b) => b.playerId === match.playerOfMatchId);
    const name = fromBat?.playerName ?? fromBowl?.playerName;
    if (name) {
      playerOfMatch = {
        playerId: match.playerOfMatchId,
        playerName: name,
        reason: fromBat
          ? `${fromBat.runs} (${fromBat.balls})`
          : fromBowl
            ? `${fromBowl.wickets}/${fromBowl.runs}`
            : "Outstanding performance",
      };
    }
  }

  return {
    highestPartnership,
    mostSixes: mostSixes && mostSixes.count > 0 ? mostSixes : null,
    mostFours: mostFours && mostFours.count > 0 ? mostFours : null,
    bestBowler: bestBowler
      ? { name: bestBowler.playerName, figures: `${bestBowler.wickets}/${bestBowler.runs}` }
      : null,
    bestBatter: bestBatter
      ? { name: bestBatter.playerName, runs: bestBatter.runs, balls: bestBatter.balls }
      : null,
    totalDotBalls: dots,
    boundaryPct: legalBalls > 0 ? Math.round((boundaries / legalBalls) * 1000) / 10 : 0,
    playerOfMatch,
  };
}

export function tossSummary(match: Match): string | null {
  if (!match.tossWinnerId || !match.tossDecision) return null;
  const winner =
    match.tossWinnerId === match.teamAId ? match.teamAName : match.teamBName;
  return `${winner} won the toss and elected to ${match.tossDecision === "bat" ? "bat" : "bowl"}`;
}

export function inningsScoreLine(innings: Innings): string {
  return `${innings.runs}/${innings.wickets} (${formatOvers(innings.overs, innings.balls)})`;
}

export function inningsRunRate(innings: Innings): number {
  return calculateRunRate(innings.runs, innings.overs, innings.balls);
}

export function allBallsFlat(ballsByInnings: Record<string, Ball[]>): Ball[] {
  return Object.values(ballsByInnings)
    .flat()
    .sort((a, b) => a.sequence - b.sequence);
}

export function ballsRemainingInInnings(innings: Innings, maxOvers: number): number {
  return maxOvers * 6 - totalBalls(innings.overs, innings.balls);
}
