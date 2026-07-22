export type UserRole = "administrator" | "scorer" | "captain" | "viewer";

export type MatchStage =
  | "round_1"
  | "integration"
  | "quarter_final"
  | "semi_final"
  | "final";

export type MatchStatus =
  | "scheduled"
  | "live"
  | "paused"
  | "completed"
  | "locked"
  | "published";

export type TossDecision = "bat" | "bowl";
export type DismissalType =
  | "bowled"
  | "caught"
  | "lbw"
  | "run_out"
  | "stumped"
  | "hit_wicket"
  | "retired_hurt"
  | "none";

export type BallExtra = "wide" | "no_ball" | "bye" | "leg_bye" | "penalty" | null;

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  teamId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Player {
  id: string;
  name: string;
  email?: string;
  teamId: string;
  photoUrl?: string;
  role: "batsman" | "bowler" | "all_rounder" | "wicket_keeper";
  battingStyle: "right_hand" | "left_hand";
  bowlingStyle: "right_arm_fast" | "right_arm_spin" | "left_arm_fast" | "left_arm_spin" | "none";
  isCaptain?: boolean;
  isViceCaptain?: boolean;
  stats: PlayerStats;
  awards: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PlayerStats {
  matches: number;
  innings: number;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  strikeRate: number;
  highestScore: number;
  fifties: number;
  hundreds: number;
  wickets: number;
  ballsBowled: number;
  runsConceded: number;
  economy: number;
  average: number;
  bestBowling: string;
  catches: number;
  runOuts: number;
  mvpPoints: number;
}

export interface Team {
  id: string;
  name: string;
  shortName: string;
  logoUrl?: string;
  captainId?: string;
  viceCaptainId?: string;
  coach?: string;
  manager?: string;
  playerIds: string[];
  stats: TeamStats;
  seed?: number;
  createdAt: string;
  updatedAt: string;
}

export interface TeamStats {
  played: number;
  won: number;
  lost: number;
  tied: number;
  nr: number;
  points: number;
  runsFor: number;
  runsAgainst: number;
  oversFor: number;
  oversAgainst: number;
  nrr: number;
  runRate: number;
}

export interface Fixture {
  id: string;
  matchId: string;
  date: string;
  day: number;
  startTime: string;
  endTime?: string;
  teamAId: string;
  teamBId: string;
  teamAName: string;
  teamBName: string;
  stage: MatchStage;
  overs: number;
  ground: string;
  status: MatchStatus;
  winnerId?: string;
  loserId?: string;
  seedA?: number;
  seedB?: number;
  placeholderA?: string;
  placeholderB?: string;
  matchDocId?: string;
  order: number;
}

export interface Match {
  id: string;
  fixtureId: string;
  matchId: string;
  stage: MatchStage;
  status: MatchStatus;
  date: string;
  startTime: string;
  ground: string;
  overs: number;
  teamAId: string;
  teamBId: string;
  teamAName: string;
  teamBName: string;
  battingTeamId?: string;
  bowlingTeamId?: string;
  playingXiA: string[];
  playingXiB: string[];
  tossWinnerId?: string;
  tossDecision?: TossDecision;
  target?: number;
  result?: MatchResult;
  locked: boolean;
  published: boolean;
  playerOfMatchId?: string;
  shareSlug: string;
  createdAt: string;
  updatedAt: string;
}

export interface MatchResult {
  winnerId: string;
  winnerName: string;
  margin: string;
  marginType: "runs" | "wickets";
  summary: string;
}

export interface Innings {
  id: string;
  matchId: string;
  teamId: string;
  teamName: string;
  inningsNumber: 1 | 2;
  runs: number;
  wickets: number;
  overs: number;
  balls: number;
  extras: ExtrasBreakdown;
  runRate: number;
  requiredRunRate?: number;
  projectedScore?: number;
  winProbability?: number;
  strikerId?: string;
  nonStrikerId?: string;
  bowlerId?: string;
  partnership: Partnership;
  lastWicket?: LastWicket;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ExtrasBreakdown {
  total: number;
  wides: number;
  noBalls: number;
  byes: number;
  legByes: number;
  penalty: number;
}

export interface Partnership {
  runs: number;
  balls: number;
  batsman1Id: string;
  batsman2Id: string;
  batsman1Runs: number;
  batsman2Runs: number;
}

export interface LastWicket {
  playerId: string;
  playerName: string;
  runs: number;
  balls: number;
  over: number;
  dismissal: string;
}

export interface Ball {
  id: string;
  matchId: string;
  inningsId: string;
  overNumber: number;
  ballNumber: number;
  sequence: number;
  bowlerId: string;
  bowlerName: string;
  strikerId: string;
  strikerName: string;
  nonStrikerId: string;
  nonStrikerName: string;
  runs: number;
  batsmanRuns: number;
  extra: BallExtra;
  isWicket: boolean;
  dismissal?: DismissalType;
  dismissedPlayerId?: string;
  fielderId?: string;
  commentary: string;
  timestamp: string;
  isLegalDelivery: boolean;
}

export interface CommentaryEntry {
  id: string;
  matchId: string;
  ballId?: string;
  text: string;
  type: "ball" | "milestone" | "wicket" | "over" | "innings" | "match";
  timestamp: string;
}

export interface PointsTableEntry {
  teamId: string;
  teamName: string;
  played: number;
  won: number;
  lost: number;
  tied: number;
  nr: number;
  points: number;
  runsFor: number;
  runsAgainst: number;
  nrr: number;
  rank: number;
}

export interface LeaderboardEntry {
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  value: number;
  rank: number;
  detail?: string;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  priority: "low" | "normal" | "high";
  publishedAt: string;
}

export interface TournamentSettings {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  venue: string;
  venueMapUrl: string;
  logoUrl?: string;
  rules: string[];
  officials: { name: string; role: string }[];
  volunteers: { name: string; role: string }[];
  emergencyContacts: { name: string; phone: string }[];
  sponsors: { name: string; logoUrl?: string; url?: string }[];
  pointsWin: number;
  pointsTie: number;
  pointsNr: number;
  currentStage: MatchStage;
}

export interface ScoringAction {
  type:
    | "dot"
    | "runs"
    | "wide"
    | "no_ball"
    | "bye"
    | "leg_bye"
    | "wicket"
    | "penalty";
  runs?: number;
  dismissal?: DismissalType;
  dismissedPlayerId?: string;
  fielderId?: string;
}

export interface BatterScore {
  playerId: string;
  playerName: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  strikeRate: number;
  isOut: boolean;
  dismissal?: string;
}

export interface BowlerScore {
  playerId: string;
  playerName: string;
  overs: number;
  balls: number;
  maidens: number;
  runs: number;
  wickets: number;
  economy: number;
}

export interface LiveMatchState {
  match: Match;
  innings: Innings[];
  currentInnings?: Innings;
  balls: Ball[];
  batters: BatterScore[];
  bowlers: BowlerScore[];
  lastSixBalls: Ball[];
  commentary: CommentaryEntry[];
}
