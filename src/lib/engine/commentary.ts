import type { ScoringAction, DismissalType } from "@/types";

interface CommentaryInput {
  action: ScoringAction;
  runs: number;
  batsmanRuns: number;
  strikerName: string;
  bowlerName: string;
  isWicket: boolean;
  dismissal?: DismissalType;
  inningsRuns: number;
  inningsWickets: number;
}

const FOUR_PHRASES = [
  "FOUR! Cracking shot through the covers!",
  "FOUR! Beautiful timing, races to the boundary!",
  "FOUR! Finds the gap perfectly!",
  "FOUR! Elegant drive to the fence!",
];

const SIX_PHRASES = [
  "SIX! Massive hit over long-on!",
  "SIX! That's gone all the way!",
  "SIX! Huge six! The crowd erupts!",
  "SIX! Clean strike over the ropes!",
];

const DOT_PHRASES = [
  "Dot ball. Excellent line and length.",
  "Defended back to the bowler.",
  "Good delivery, no run.",
  "Tight bowling, batsman can't get away.",
];

const SINGLE_PHRASES = [
  "Quick single taken.",
  "They run one comfortably.",
  "Rotated the strike with a single.",
];

export function generateCommentary(input: CommentaryInput): string {
  const { action, runs, batsmanRuns, strikerName, bowlerName, isWicket, dismissal, inningsRuns } = input;

  if (isWicket) {
    return getWicketCommentary(strikerName, bowlerName, dismissal, runs);
  }

  if (action.type === "wide") {
    return `Wide from ${bowlerName}. ${runs > 1 ? `${runs} runs` : "Extra run"} to the batting side.`;
  }

  if (action.type === "no_ball") {
    if (batsmanRuns >= 6) return `NO BALL and SIX! Free hit coming! ${strikerName} launches it!`;
    if (batsmanRuns === 4) return `NO BALL and FOUR! ${strikerName} punishes the loose delivery!`;
    return `No ball from ${bowlerName}. Free hit to follow.`;
  }

  if (action.type === "bye" || action.type === "leg_bye") {
    return `${action.type === "bye" ? "Bye" : "Leg bye"} for ${runs} run${runs > 1 ? "s" : ""}.`;
  }

  if (action.type === "penalty") {
    return `${runs} penalty runs awarded to the batting side.`;
  }

  if (batsmanRuns === 6) {
    return pick(SIX_PHRASES).replace("!", `! ${strikerName} `);
  }

  if (batsmanRuns === 4) {
    return pick(FOUR_PHRASES).replace("!", `! ${strikerName} `);
  }

  if (batsmanRuns === 0 && action.type === "dot") {
    return `${pick(DOT_PHRASES)} ${bowlerName} to ${strikerName}.`;
  }

  if (batsmanRuns === 1) {
    return `${pick(SINGLE_PHRASES)} ${strikerName} off ${bowlerName}.`;
  }

  if (batsmanRuns === 2) {
    return `Two runs. Good running between the wickets.`;
  }

  if (batsmanRuns === 3) {
    return `Three runs! Excellent effort in the field.`;
  }

  if (inningsRuns === 50 || inningsRuns === 100 || inningsRuns === 150) {
    return `Team total crosses ${inningsRuns}!`;
  }

  return `${batsmanRuns} run${batsmanRuns !== 1 ? "s" : ""}. ${strikerName} off ${bowlerName}.`;
}

function getWicketCommentary(
  batsman: string,
  bowler: string,
  dismissal?: DismissalType,
  runs = 0
): string {
  const prefix = runs > 0 ? `${runs} run${runs > 1 ? "s" : ""} and OUT! ` : "OUT! ";
  switch (dismissal) {
    case "bowled":
      return `${prefix}${batsman} is bowled by ${bowler}! The stumps are shattered!`;
    case "caught":
      return `${prefix}Brilliant catch! ${batsman} departs, caught off ${bowler}!`;
    case "lbw":
      return `${prefix}LBW! ${batsman} is trapped in front by ${bowler}!`;
    case "run_out":
      return `${prefix}Run out! ${batsman} is short of the crease!`;
    case "stumped":
      return `${prefix}Stumped! ${batsman} beaten by ${bowler}!`;
    case "hit_wicket":
      return `${prefix}Hit wicket! ${batsman} dislodges the bails!`;
    case "retired_hurt":
      return `${batsman} retires hurt.`;
    default:
      return `${prefix}WICKET! ${batsman} is out!`;
  }
}

export function getMilestoneCommentary(
  type: "fifty" | "hundred" | "five_wickets" | "hat_trick" | "partnership",
  name: string,
  value?: number
): string {
  switch (type) {
    case "fifty":
      return `FIFTY for ${name}! What an innings!`;
    case "hundred":
      return `CENTURY! ${name} reaches a magnificent hundred!`;
    case "five_wickets":
      return `FIVE WICKETS for ${name}! Outstanding spell of bowling!`;
    case "hat_trick":
      return `HAT-TRICK! ${name} takes three in three!`;
    case "partnership":
      return `${value}-run partnership building nicely!`;
    default:
      return "";
  }
}

function pick(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}
