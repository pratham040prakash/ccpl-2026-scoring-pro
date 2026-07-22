import type { StoredMatchScore } from "@/types/scores";
import { loadStoredScores, saveStoredScores } from "@/lib/scores/store";
import type { Innings, Match } from "@/types";
import { buildStoredScoreFromLive } from "@/lib/engine/match-finalization";

export function syncLiveResultToLocalStorage(
  match: Match,
  inningsList: Innings[]
): StoredMatchScore | null {
  const stored = buildStoredScoreFromLive(match, inningsList);
  if (!stored) return null;

  const all = loadStoredScores();
  all[match.fixtureId] = stored;
  saveStoredScores(all);
  return stored;
}

export async function finalizeMatchViaApi(
  matchId: string,
  idToken: string
): Promise<{ success: boolean; message?: string; summary?: string }> {
  const res = await fetch(`/api/matches/${matchId}/finalize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
    },
  });

  const data = (await res.json()) as {
    success: boolean;
    message?: string;
    summary?: string;
  };

  if (!res.ok) {
    return { success: false, message: data.message ?? "Finalize failed" };
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("ccpl-standings-updated"));
  }

  return data;
}
