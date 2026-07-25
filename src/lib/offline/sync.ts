import type { ScoringAction } from "@/types";
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
import { logScoring } from "@/lib/live/scoring-logger";
import { resolveMatchDocId } from "@/lib/live/match-doc-id";
import type { Fixture } from "@/types";

export async function syncPendingActions(
  routeMatchId: string,
  user?: ScoringUser,
  fixture?: Pick<Fixture, "id" | "matchDocId">
): Promise<number> {
  const matchDocId = resolveMatchDocId(fixture) || routeMatchId;
  const pending = (await getPendingActions(matchDocId))
    .concat(await getPendingActions(routeMatchId))
    .filter((p) => !p.synced)
    .sort((a, b) => a.sequence - b.sequence);

  const seen = new Set<string>();
  const unique = pending.filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });

  if (unique.length === 0) return 0;

  let match = await getMatch(matchDocId);
  if (!match && routeMatchId !== matchDocId) {
    match = await getMatch(routeMatchId);
  }
  if (!match) return 0;

  let inningsList = await getInnings(match.id);
  let synced = 0;

  for (const action of unique) {
    let innings = inningsList.find((i) => i.id === action.inningsId);
    if (!innings) {
      innings = inningsList.find((i) => !i.completed) ?? inningsList[inningsList.length - 1];
    }
    if (!innings) continue;

    const balls = await getBalls(innings.id);
    const already = balls.some((b) => b.sequence === action.sequence);
    if (already) {
      await markActionSynced(action.id);
      continue;
    }

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
    inningsList = await getInnings(match.id);
    synced++;
    logScoring("sync", "Replayed offline ball", { sequence: action.sequence, matchId: match.id });
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
  match: import("@/types").Match,
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
