import type { Ball, ScoringAction } from "@/types";
import { getMilestoneCommentary } from "@/lib/engine/commentary";

export type LiveEventType =
  | "boundary"
  | "six"
  | "wicket"
  | "fifty"
  | "hundred"
  | "five_wickets"
  | "innings_complete"
  | "match_complete";

export interface LiveEvent {
  type: LiveEventType;
  title: string;
  body: string;
}

export function detectLiveEvents(
  ball: Ball,
  action: ScoringAction,
  priorBatterRuns: number,
  priorBowlerWickets: number,
  completeInnings: boolean,
  matchComplete: boolean
): LiveEvent[] {
  const events: LiveEvent[] = [];

  if (ball.isWicket) {
    events.push({
      type: "wicket",
      title: "WICKET!",
      body: ball.commentary,
    });
  }

  if (ball.batsmanRuns === 4 && !ball.isWicket) {
    events.push({
      type: "boundary",
      title: "FOUR!",
      body: `${ball.strikerName} — ${ball.commentary}`,
    });
  }

  if (ball.batsmanRuns === 6 || ball.runs === 6) {
    events.push({
      type: "six",
      title: "SIX!",
      body: `${ball.strikerName} — ${ball.commentary}`,
    });
  }

  const batterTotal = priorBatterRuns + ball.batsmanRuns;
  if (priorBatterRuns < 50 && batterTotal >= 50) {
    events.push({
      type: "fifty",
      title: "FIFTY!",
      body: getMilestoneCommentary("fifty", ball.strikerName),
    });
  }
  if (priorBatterRuns < 100 && batterTotal >= 100) {
    events.push({
      type: "hundred",
      title: "CENTURY!",
      body: getMilestoneCommentary("hundred", ball.strikerName),
    });
  }

  if (action.type === "wicket" && priorBowlerWickets === 4) {
    events.push({
      type: "five_wickets",
      title: "FIVE WICKETS!",
      body: getMilestoneCommentary("five_wickets", ball.bowlerName),
    });
  }

  if (completeInnings && !matchComplete) {
    events.push({
      type: "innings_complete",
      title: "Innings Complete",
      body: `Innings finished at ${ball.overNumber}.${ball.ballNumber}`,
    });
  }

  if (matchComplete) {
    events.push({
      type: "match_complete",
      title: "Match Finished",
      body: "Final result and standings updated",
    });
  }

  return events;
}

export function showBrowserNotification(title: string, body: string): void {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, icon: "/icons/icon-192.png" });
  } catch {
    /* ignore */
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}
