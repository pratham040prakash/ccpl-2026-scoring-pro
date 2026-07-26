import type { Ball, BatterScore, BowlerScore } from "@/types";
import teamsData from "@/data/teams.json";
import type { RosterPlayer } from "@/lib/live/player-roster";
import { economy, strikeRate } from "@/lib/utils";

export type PlayerBattingStatus =
  | "batting_striker"
  | "batting_non_striker"
  | "yet_to_bat"
  | "out"
  | "retired"
  | "unavailable";

export type BowlerSuggestionReason =
  | "previous_partner"
  | "best_economy"
  | "most_wickets"
  | "last_used"
  | "only_eligible";

const ORDER_PREFIX = "ccpl-batting-order";

export function battingOrderKey(matchId: string, inningsId: string): string {
  return `${ORDER_PREFIX}:${matchId}:${inningsId}`;
}

export function loadBattingOrder(
  matchId: string,
  inningsId: string,
  battingXi: RosterPlayer[]
): string[] {
  if (typeof window === "undefined") return battingXi.map((p) => p.id);
  try {
    const raw = localStorage.getItem(battingOrderKey(matchId, inningsId));
    if (!raw) return battingXi.map((p) => p.id);
    const saved = JSON.parse(raw) as string[];
    const xiIds = new Set(battingXi.map((p) => p.id));
    const ordered = saved.filter((id) => xiIds.has(id));
    for (const p of battingXi) {
      if (!ordered.includes(p.id)) ordered.push(p.id);
    }
    return ordered;
  } catch {
    return battingXi.map((p) => p.id);
  }
}

export function saveBattingOrder(
  matchId: string,
  inningsId: string,
  order: string[]
): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(battingOrderKey(matchId, inningsId), JSON.stringify(order));
}

export function maxOversPerBowler(matchOvers: number): number {
  return Math.max(1, Math.ceil(matchOvers / 3));
}

export function getTeamCaptainName(teamName: string): string | undefined {
  return teamsData.find((t) => t.name === teamName)?.captain;
}

export function isCaptain(player: RosterPlayer, teamName: string): boolean {
  const captain = getTeamCaptainName(teamName);
  return Boolean(captain && player.name === captain);
}

export function getBattingStatus(
  playerId: string,
  opts: {
    strikerId?: string;
    nonStrikerId?: string;
    outIds: Set<string>;
    retiredIds?: Set<string>;
    inXi: boolean;
  }
): PlayerBattingStatus {
  if (!opts.inXi) return "unavailable";
  if (opts.retiredIds?.has(playerId)) return "retired";
  if (opts.outIds.has(playerId)) return "out";
  if (playerId === opts.strikerId) return "batting_striker";
  if (playerId === opts.nonStrikerId) return "batting_non_striker";
  return "yet_to_bat";
}

export function statusColor(status: PlayerBattingStatus): string {
  switch (status) {
    case "batting_striker":
    case "batting_non_striker":
      return "border-emerald-400/60 bg-emerald-500/10";
    case "yet_to_bat":
      return "border-blue-400/40 bg-blue-500/5";
    case "out":
      return "border-red-400/30 bg-red-500/5 opacity-50";
    case "retired":
      return "border-orange-400/40 bg-orange-500/10 opacity-60";
    default:
      return "border-slate-500/30 bg-slate-800/40 opacity-40";
  }
}

export function statusLabel(status: PlayerBattingStatus): string {
  switch (status) {
    case "batting_striker":
      return "Striker";
    case "batting_non_striker":
      return "Non-Striker";
    case "yet_to_bat":
      return "Not Out";
    case "out":
      return "Out";
    case "retired":
      return "Retired";
    default:
      return "Unavailable";
  }
}

export function sortBattersByOrder(
  battingXi: RosterPlayer[],
  order: string[]
): RosterPlayer[] {
  const rank = new Map(order.map((id, i) => [id, i]));
  return [...battingXi].sort(
    (a, b) => (rank.get(a.id) ?? 999) - (rank.get(b.id) ?? 999)
  );
}

export function getAvailableBatters(
  battingXi: RosterPlayer[],
  order: string[],
  opts: {
    outIds: Set<string>;
    excludeIds?: string[];
  }
): RosterPlayer[] {
  const exclude = new Set(opts.excludeIds ?? []);
  return sortBattersByOrder(battingXi, order).filter(
    (p) => !opts.outIds.has(p.id) && !exclude.has(p.id)
  );
}

export function getNextSuggestedBatter(
  battingXi: RosterPlayer[],
  order: string[],
  opts: {
    outIds: Set<string>;
    strikerId?: string;
    nonStrikerId?: string;
    excludeIds?: string[];
  }
): RosterPlayer | null {
  const available = getAvailableBatters(battingXi, order, {
    outIds: opts.outIds,
    excludeIds: [...(opts.excludeIds ?? []), opts.strikerId, opts.nonStrikerId].filter(
      Boolean
    ) as string[],
  });
  return available[0] ?? null;
}

export function countBowlerDots(balls: Ball[], bowlerId: string): number {
  return balls.filter(
    (b) => b.bowlerId === bowlerId && b.isLegalDelivery && b.runs === 0 && !b.isWicket
  ).length;
}

export function getBowlerDisplayStats(
  bowler: BowlerScore | null,
  balls: Ball[],
  matchOvers: number
): {
  oversLabel: string;
  oversLeft: number;
  dots: number;
  economy: number;
} {
  if (!bowler) {
    return { oversLabel: "0.0", oversLeft: maxOversPerBowler(matchOvers), dots: 0, economy: 0 };
  }
  const maxBalls = maxOversPerBowler(matchOvers) * 6;
  const oversLeft = Math.max(0, (maxBalls - bowler.balls) / 6);
  return {
    oversLabel: `${Math.floor(bowler.balls / 6)}.${bowler.balls % 6}`,
    oversLeft: Math.round(oversLeft * 10) / 10,
    dots: countBowlerDots(balls, bowler.playerId),
    economy: bowler.economy,
  };
}

export function getEligibleBowlers(
  bowlingXi: RosterPlayer[],
  bowlers: BowlerScore[],
  currentBowlerId: string | undefined,
  matchOvers: number
): RosterPlayer[] {
  const maxBalls = maxOversPerBowler(matchOvers) * 6;
  const ballsMap = new Map(bowlers.map((b) => [b.playerId, b.balls]));

  return bowlingXi.filter((p) => {
    if (p.id === currentBowlerId) return false;
    const bowled = ballsMap.get(p.id) ?? 0;
    return bowled < maxBalls;
  });
}

export function getPreviousOverBowlerId(balls: Ball[]): string | undefined {
  if (balls.length === 0) return undefined;
  const last = balls[balls.length - 1];
  const prevOver = last.overNumber - 1;
  if (prevOver < 0) return undefined;
  for (let i = balls.length - 1; i >= 0; i--) {
    if (balls[i].overNumber === prevOver) return balls[i].bowlerId;
  }
  return undefined;
}

export function suggestBowler(
  bowlingXi: RosterPlayer[],
  bowlers: BowlerScore[],
  balls: Ball[],
  currentBowlerId: string | undefined,
  matchOvers: number
): { playerId: string; reason: BowlerSuggestionReason } | null {
  const eligible = getEligibleBowlers(bowlingXi, bowlers, currentBowlerId, matchOvers);
  if (eligible.length === 0) return null;
  if (eligible.length === 1) {
    return { playerId: eligible[0].id, reason: "only_eligible" };
  }

  const stats = new Map(bowlers.map((b) => [b.playerId, b]));
  const prevPartner = getPreviousOverBowlerId(balls);
  if (prevPartner && eligible.some((p) => p.id === prevPartner)) {
    return { playerId: prevPartner, reason: "previous_partner" };
  }

  const withStats = eligible
    .map((p) => ({ player: p, stat: stats.get(p.id) }))
    .filter((x) => x.stat && x.stat.balls > 0);

  if (withStats.length > 0) {
    const bestEconomy = [...withStats].sort(
      (a, b) => (a.stat!.economy - b.stat!.economy) || (b.stat!.wickets - a.stat!.wickets)
    )[0];
    if (bestEconomy) {
      return { playerId: bestEconomy.player.id, reason: "best_economy" };
    }
  }

  const mostWickets = [...eligible].sort(
    (a, b) => (stats.get(b.id)?.wickets ?? 0) - (stats.get(a.id)?.wickets ?? 0)
  )[0];
  if (mostWickets && (stats.get(mostWickets.id)?.wickets ?? 0) > 0) {
    return { playerId: mostWickets.id, reason: "most_wickets" };
  }

  const lastBallBowler = balls.length > 0 ? balls[balls.length - 1].bowlerId : undefined;
  const lastUsed = eligible.find((p) => p.id === lastBallBowler);
  if (lastUsed) {
    return { playerId: lastUsed.id, reason: "last_used" };
  }

  return { playerId: eligible[0].id, reason: "only_eligible" };
}

export function suggestionBadge(reason: BowlerSuggestionReason): string {
  switch (reason) {
    case "previous_partner":
      return "Previous partner";
    case "best_economy":
      return "Best economy";
    case "most_wickets":
      return "Top wicket-taker";
    case "last_used":
      return "Recent";
    case "only_eligible":
      return "Suggested";
  }
}

export function ballCompletedOver(ball: Ball): boolean {
  return ball.isLegalDelivery && ball.ballNumber >= 6;
}

export function validateBatterPick(
  playerId: string,
  role: "striker" | "non_striker" | "new_batter",
  opts: {
    outIds: Set<string>;
    strikerId?: string;
    nonStrikerId?: string;
  }
): string | null {
  if (opts.outIds.has(playerId)) return "This batter is already out.";
  if (role === "striker" && playerId === opts.nonStrikerId) {
    return "Non-striker is already at the crease.";
  }
  if (role === "non_striker" && playerId === opts.strikerId) {
    return "Striker is already at the crease.";
  }
  if (role === "new_batter" && (playerId === opts.strikerId || playerId === opts.nonStrikerId)) {
    return "Pick a batter who is not currently batting.";
  }
  return null;
}

export function validateBowlerPick(
  playerId: string,
  currentBowlerId: string | undefined,
  bowlers: BowlerScore[],
  matchOvers: number
): string | null {
  if (playerId === currentBowlerId) {
    return "Same bowler cannot bowl consecutive overs.";
  }
  const maxBalls = maxOversPerBowler(matchOvers) * 6;
  const stat = bowlers.find((b) => b.playerId === playerId);
  if (stat && stat.balls >= maxBalls) {
    return "This bowler has reached their over limit.";
  }
  return null;
}

export function buildBatterCardStats(
  player: RosterPlayer,
  batters: BatterScore[],
  jerseyNumber: number
): BatterScore & { jerseyNumber: number } {
  const stat = batters.find((b) => b.playerId === player.id);
  if (stat) return { ...stat, jerseyNumber };
  return {
    playerId: player.id,
    playerName: player.name,
    runs: 0,
    balls: 0,
    fours: 0,
    sixes: 0,
    strikeRate: 0,
    isOut: false,
    jerseyNumber,
  };
}

export function filterPlayersBySearch(
  players: RosterPlayer[],
  query: string,
  jerseyMap: Map<string, number>
): RosterPlayer[] {
  const q = query.trim().toLowerCase();
  if (!q) return players;
  return players.filter((p) => {
    const jersey = String(jerseyMap.get(p.id) ?? "");
    return p.name.toLowerCase().includes(q) || jersey.includes(q);
  });
}

export function formatBatterLine(stat: BatterScore): string {
  return `${stat.runs} (${stat.balls}) · 4s ${stat.fours} · 6s ${stat.sixes} · SR ${strikeRate(stat.runs, stat.balls)}`;
}

export function formatBowlerLine(
  stat: BowlerScore,
  balls: Ball[],
  matchOvers: number
): string {
  const { oversLabel, dots, economy: eco } = getBowlerDisplayStats(stat, balls, matchOvers);
  const { oversLeft } = getBowlerDisplayStats(stat, balls, matchOvers);
  return `${oversLabel}-${stat.runs}-${stat.wickets} · Econ ${eco.toFixed(1)} · Dots ${dots} · ${oversLeft} ov left`;
}
