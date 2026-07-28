import { getInnings, getMatches } from "@/lib/firebase/firestore";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import { buildStoredScoreFromLive } from "@/lib/engine/match-finalization";
import { buildSeedData } from "@/lib/seed";
import type { Fixture, Match } from "@/types";
import type { StoredMatchScore } from "@/types/scores";

function isStandingsEligibleMatch(match: Match): boolean {
  if (match.status === "completed") return true;
  return match.locked === true && Boolean(match.result?.winnerName || match.result?.summary);
}

function resolveFixtureKey(match: Match, fixtures: Fixture[]): string {
  if (match.fixtureId && fixtures.some((fixture) => fixture.id === match.fixtureId)) {
    return match.fixtureId;
  }
  const fixture = fixtures.find(
    (entry) => entry.matchId.toUpperCase() === match.matchId?.toUpperCase()
  );
  return fixture?.id ?? match.fixtureId;
}

/** Pull finalized live scores from Firestore so all devices see the same results. */
export async function fetchCompletedScoresFromFirestore(): Promise<
  Record<string, StoredMatchScore>
> {
  if (!isFirebaseConfigured()) return {};

  const seed = buildSeedData();
  const matches = await getMatches();
  const eligible = matches.filter(isStandingsEligibleMatch);
  const scores: Record<string, StoredMatchScore> = {};

  await Promise.all(
    eligible.map(async (match) => {
      const inningsList = (await getInnings(match.id)).sort(
        (a, b) => a.inningsNumber - b.inningsNumber
      );
      if (inningsList.length < 2) return;

      const stored = buildStoredScoreFromLive(match, inningsList);
      if (!stored) return;

      scores[resolveFixtureKey(match, seed.fixtures)] = stored;
    })
  );

  return scores;
}

export function mergeScoreLayers(
  local: Record<string, StoredMatchScore>,
  remote: Record<string, StoredMatchScore>
): Record<string, StoredMatchScore> {
  const merged = { ...local };

  for (const [fixtureId, remoteScore] of Object.entries(remote)) {
    const existing = merged[fixtureId];
    if (!existing) {
      merged[fixtureId] = remoteScore;
      continue;
    }

    const existingAt = Date.parse(existing.updatedAt ?? "") || 0;
    const remoteAt = Date.parse(remoteScore.updatedAt ?? "") || 0;
    if (remoteAt >= existingAt) {
      merged[fixtureId] = remoteScore;
    }
  }

  return merged;
}

export async function fetchStaticScores(): Promise<Record<string, StoredMatchScore>> {
  if (typeof window === "undefined") return {};
  try {
    const res = await fetch("/data/scores.json", { cache: "no-store" });
    if (!res.ok) return {};
    const payload = (await res.json()) as { scores?: Record<string, StoredMatchScore> };
    return payload.scores ?? {};
  } catch {
    return {};
  }
}
