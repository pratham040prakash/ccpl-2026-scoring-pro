"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Fixture, PointsTableEntry } from "@/types";
import type { ScoreImportRow, StoredMatchScore } from "@/types/scores";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import { DEMO_DATA } from "@/lib/seed";
import {
  fetchCompletedScoresFromFirestore,
  fetchStaticScores,
  mergeScoreLayers,
} from "@/lib/scores/firestore-scores";
import {
  getOfficialDay1Scores,
  mergeWithOfficialScores,
  saveUserScoresOnly,
} from "@/lib/scores/official-results";
import { resolveFixturesWithScores } from "@/lib/scores/fixture-resolution";
import {
  buildPointsTableFromScores,
  buildStoredScore,
  loadStoredScores,
  mergeFixturesWithScores,
} from "@/lib/scores/store";
import { buildFairPointsTableFromScores } from "@/lib/scores/fair-standings";

interface MatchResultsContextValue {
  scores: Record<string, StoredMatchScore>;
  applyScore: (fixture: Fixture, row: Omit<ScoreImportRow, "matchId" | "errors">, source: StoredMatchScore["source"]) => void;
  applyBulkScores: (rows: ScoreImportRow[], fixtures: Fixture[]) => { applied: number; errors: string[] };
  removeScore: (fixtureId: string) => void;
  getMergedFixtures: (base: Fixture[]) => Fixture[];
  getPointsTable: (teams?: typeof DEMO_DATA.teams) => PointsTableEntry[];
}

const MatchResultsContext = createContext<MatchResultsContextValue | null>(null);

export function MatchResultsProvider({ children }: { children: ReactNode }) {
  const [scores, setScores] = useState<Record<string, StoredMatchScore>>(() =>
    mergeWithOfficialScores(loadStoredScores())
  );
  const queryClient = useQueryClient();

  const reloadScores = useCallback(async () => {
    const local = mergeWithOfficialScores(loadStoredScores());
    const staticScores = await fetchStaticScores();
    const withStatic = mergeScoreLayers(local, staticScores);

    if (!isFirebaseConfigured()) {
      setScores(withStatic);
      return;
    }

    try {
      const remote = await fetchCompletedScoresFromFirestore();
      setScores(mergeScoreLayers(withStatic, remote));
    } catch {
      setScores(withStatic);
    }
  }, []);

  useEffect(() => {
    void reloadScores();
  }, [reloadScores]);

  useEffect(() => {
    const refresh = () => {
      void reloadScores();
      queryClient.invalidateQueries({ queryKey: ["fixtures"] });
      queryClient.invalidateQueries({ queryKey: ["pointsTable"] });
    };

    window.addEventListener("ccpl-scores-reload", refresh);
    window.addEventListener("ccpl-standings-updated", refresh);
    return () => {
      window.removeEventListener("ccpl-scores-reload", refresh);
      window.removeEventListener("ccpl-standings-updated", refresh);
    };
  }, [queryClient, reloadScores]);

  useEffect(() => {
    if (!isFirebaseConfigured()) return;
    const timer = window.setInterval(() => {
      void reloadScores();
    }, 30000);
    return () => window.clearInterval(timer);
  }, [reloadScores]);

  const persist = useCallback(
    (next: Record<string, StoredMatchScore>) => {
      setScores(next);
      saveUserScoresOnly(next);
      queryClient.invalidateQueries({ queryKey: ["fixtures"] });
      queryClient.invalidateQueries({ queryKey: ["pointsTable"] });
    },
    [queryClient]
  );

  const applyScore = useCallback(
    (
      fixture: Fixture,
      row: Omit<ScoreImportRow, "matchId" | "errors">,
      source: StoredMatchScore["source"]
    ) => {
      const stored = buildStoredScore(fixture, row, DEMO_DATA.teams, source);
      const next = { ...scores, [fixture.id]: stored };
      persist(next);
    },
    [scores, persist]
  );

  const applyBulkScores = useCallback(
    (rows: ScoreImportRow[], fixtures: Fixture[]) => {
      const errors: string[] = [];
      let applied = 0;
      const next = { ...scores };

      for (const row of rows) {
        if (row.errors.length) {
          errors.push(`${row.matchId}: ${row.errors.join(", ")}`);
          continue;
        }
        const fixture = fixtures.find((f) => f.matchId.toUpperCase() === row.matchId.toUpperCase());
        if (!fixture) {
          errors.push(`${row.matchId}: fixture not found`);
          continue;
        }
        next[fixture.id] = buildStoredScore(fixture, row, DEMO_DATA.teams, "csv");
        applied++;
      }

      persist(next);
      return { applied, errors };
    },
    [scores, persist]
  );

  const removeScore = useCallback(
    (fixtureId: string) => {
      const next = { ...scores };
      delete next[fixtureId];
      persist(next);
    },
    [scores, persist]
  );

  const getMergedFixtures = useCallback(
    (base: Fixture[]) => resolveFixturesWithScores(base, scores),
    [scores]
  );

  const getPointsTable = useCallback(
    (teams = DEMO_DATA.teams) => {
      const merged = mergeFixturesWithScores(DEMO_DATA.fixtures, scores);
      const table = buildFairPointsTableFromScores(teams, merged, scores);
      if (table.length === 0) {
        return teams.map((t, i) => ({
          teamId: t.id,
          teamName: t.name,
          played: 0,
          won: 0,
          lost: 0,
          tied: 0,
          nr: 0,
          points: 0,
          runsFor: 0,
          runsAgainst: 0,
          nrr: 0,
          rank: i + 1,
        }));
      }
      return table;
    },
    [scores]
  );

  const value = useMemo(
    () => ({
      scores,
      applyScore,
      applyBulkScores,
      removeScore,
      getMergedFixtures,
      getPointsTable,
    }),
    [scores, applyScore, applyBulkScores, removeScore, getMergedFixtures, getPointsTable]
  );

  return (
    <MatchResultsContext.Provider value={value}>{children}</MatchResultsContext.Provider>
  );
}

export function useMatchResults() {
  const ctx = useContext(MatchResultsContext);
  if (!ctx) throw new Error("useMatchResults must be used within MatchResultsProvider");
  return ctx;
}
