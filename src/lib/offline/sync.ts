import type { Match, ScoringAction } from "@/types";
import {
  applyScoringAction,
  type ScoringContext,
  type ScoringUser,
} from "@/lib/engine/live-scoring-service";
import {
  getPendingActions,
  markActionSynced,
  type PendingAction,
} from "@/lib/offline/store";
import { getMatch, getInnings, getBalls } from "@/lib/firebase/firestore";

export async function syncPendingActions(
  matchId: string,
  user?: ScoringUser
): Promise<number> {
  const pending = (await getPendingActions(matchId))
    .filter((p) => !p.synced)
    .sort((a, b) => a.sequence - b.sequence);

  if (pending.length === 0) return 0;

  const match = await getMatch(matchId);
  if (!match) return 0;

  const inningsList = await getInnings(matchId);
  let synced = 0;

  for (const action of pending) {
    const innings = inningsList.find((i) => i.id === action.inningsId);
    if (!innings) continue;

    const balls = await getBalls(innings.id);
    const ctx: ScoringContext = {
      strikerId: action.strikerId,
      strikerName: action.strikerName,
      nonStrikerId: action.nonStrikerId,
      nonStrikerName: action.nonStrikerName,
      bowlerId: action.bowlerId,
      bowlerName: action.bowlerName,
    };

    await applyScoringAction(match, innings, balls, action.action, ctx, user);
    await markActionSynced(action.id);
    synced++;
  }

  return synced;
}

export function pendingToContext(action: PendingAction): ScoringContext {
  return {
    strikerId: action.strikerId,
    strikerName: action.strikerName,
    nonStrikerId: action.nonStrikerId,
    nonStrikerName: action.nonStrikerName,
    bowlerId: action.bowlerId,
    bowlerName: action.bowlerName,
  };
}

export async function queueOrApply(
  online: boolean,
  match: Match,
  innings: import("@/types").Innings,
  balls: import("@/types").Ball[],
  action: ScoringAction,
  ctx: ScoringContext,
  queueFn: (pending: PendingAction) => Promise<void>,
  sequence: number,
  user?: ScoringUser
) {
  if (!online) {
    const { generateId } = await import("@/lib/utils");
    await queueFn({
      id: generateId("pending"),
      matchId: match.id,
      inningsId: innings.id,
      action,
      ...ctx,
      sequence,
      createdAt: new Date().toISOString(),
      synced: false,
    });
    return null;
  }
  return applyScoringAction(match, innings, balls, action, ctx, user);
}
