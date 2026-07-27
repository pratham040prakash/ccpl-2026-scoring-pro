import type { TossDecision } from "@/types";

export interface TeamPlayingMeta {
  captainId?: string;
  viceCaptainId?: string;
  wicketKeeperId?: string;
  substituteIds?: string[];
}

export interface MatchOfficials {
  scorer?: string;
  umpires?: string;
}

export interface MatchSettingsConfig {
  overs: number;
  powerplayOvers?: number;
  ballType?: "tennis" | "leather" | "synthetic";
  ground?: string;
  weather?: string;
  pitch?: "dry" | "green" | "dusty" | "balanced";
  matchType?: string;
  superOverEnabled?: boolean;
  dlsEnabled?: boolean;
}

/** Payload collected by the Match Setup Wizard before live scoring starts. */
export interface MatchSetupInput {
  tossWinnerId: string;
  tossDecision: TossDecision;
  playingXiA: string[];
  playingXiB: string[];
  teamAMeta: TeamPlayingMeta;
  teamBMeta: TeamPlayingMeta;
  strikerId: string;
  nonStrikerId: string;
  openingBowlerId: string;
  officials: MatchOfficials;
  settings: MatchSettingsConfig;
}

export type MatchSetupStep =
  | "info"
  | "toss"
  | "playing_xi"
  | "openers"
  | "bowler"
  | "settings"
  | "review";

export const MATCH_SETUP_STEPS: { id: MatchSetupStep; label: string }[] = [
  { id: "info", label: "Match Details" },
  { id: "toss", label: "Toss" },
  { id: "playing_xi", label: "Playing XI" },
  { id: "openers", label: "Openers" },
  { id: "bowler", label: "Bowler" },
  { id: "settings", label: "Settings" },
  { id: "review", label: "Review" },
];

export interface MatchSetupDraft extends Partial<MatchSetupInput> {
  step: MatchSetupStep;
}
