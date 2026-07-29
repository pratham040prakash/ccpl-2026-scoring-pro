"use client";

import { useEffect, useMemo, useState } from "react";
import type { Ball, BatterScore, BowlerScore, Innings, Match } from "@/types";
import type { StoredMatchScore } from "@/types/scores";
import {
  aggregateBatterScores,
  aggregateBowlerScores,
} from "@/lib/engine/statistics";
import { getBalls } from "@/lib/firebase/firestore";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import {
  buildInningsFromStoredScore,
  buildMatchFromStoredScore,
  resolveScorecardMode,
  type ScorecardMode,
} from "@/lib/match/match-scorecard";
import { useLiveMatch } from "./use-live-match";
import { useMatchScore, useFixtures } from "./use-tournament-data";

export interface UseMatchScorecardResult {
  mode: ScorecardMode;
  loading: boolean;
  fixture?: ReturnType<typeof useLiveMatch>["fixture"];
  match: Match;
  storedScore?: StoredMatchScore;
  innings: Innings[];
  selectedInnings?: Innings;
  selectedInningsId: string | null;
  setSelectedInningsId: (id: string) => void;
  batters: BatterScore[];
  bowlers: BowlerScore[];
  ballsByInnings: Record<string, Ball[]>;
  isLive: boolean;
  liveBalls: Ball[];
  liveBatters: BatterScore[];
  liveBowlers: BowlerScore[];
  lastSixBalls: Ball[];
  commentary: ReturnType<typeof useLiveMatch>["commentary"];
  currentInnings?: Innings;
}

export function useMatchScorecard(fixtureId: string): UseMatchScorecardResult {
  const live = useLiveMatch(fixtureId);
  const storedScore = useMatchScore(fixtureId);
  const { data: fixtures = [] } = useFixtures();
  const fixture = live.fixture ?? fixtures.find((f) => f.id === fixtureId);

  const [ballsByInnings, setBallsByInnings] = useState<Record<string, Ball[]>>({});
  const [ballsLoading, setBallsLoading] = useState(false);

  const summaryInnings = useMemo(
    () => (fixture && storedScore ? buildInningsFromStoredScore(fixture, storedScore) : null),
    [fixture, storedScore]
  );

  const firestoreInnings = live.innings.filter((inn) => inn.completed || inn.runs > 0);
  const innings =
    firestoreInnings.length >= 2 ? firestoreInnings : summaryInnings ?? firestoreInnings;

  const hasBallByBall = useMemo(
    () => Object.values(ballsByInnings).some((balls) => balls.length > 0),
    [ballsByInnings]
  );

  const mode = resolveScorecardMode({
    fixtureStatus: fixture?.status,
    storedScore,
    firestoreInningsCount: firestoreInnings.length,
    hasBallByBall,
  });

  const [selectedInningsId, setSelectedInningsId] = useState<string | null>(null);

  useEffect(() => {
    if (!innings.length) return;
    setSelectedInningsId((current) => {
      if (current && innings.some((inn) => inn.id === current)) return current;
      return innings[innings.length - 1]?.id ?? null;
    });
  }, [innings]);

  useEffect(() => {
    if (!innings.length || mode === "summary" || mode === "pending") {
      setBallsByInnings({});
      return;
    }

    let cancelled = false;
    setBallsLoading(true);

    void Promise.all(
      innings.map(async (inn) => {
        if (isFirebaseConfigured()) {
          return [inn.id, await getBalls(inn.id)] as const;
        }
        if (live.currentInnings?.id === inn.id && live.balls.length) {
          return [inn.id, live.balls] as const;
        }
        return [inn.id, [] as Ball[]] as const;
      })
    ).then((entries) => {
      if (cancelled) return;
      setBallsByInnings(Object.fromEntries(entries));
      setBallsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [innings, mode, live.balls, live.currentInnings?.id]);

  const selectedInnings = innings.find((inn) => inn.id === selectedInningsId) ?? innings.at(-1);
  const selectedBalls = selectedInnings ? ballsByInnings[selectedInnings.id] ?? [] : [];

  const batters = useMemo(() => aggregateBatterScores(selectedBalls), [selectedBalls]);
  const bowlers = useMemo(() => aggregateBowlerScores(selectedBalls), [selectedBalls]);

  const match = useMemo(() => {
    if (live.match?.result?.winnerName) return live.match;
    if (fixture && storedScore) return buildMatchFromStoredScore(fixture, storedScore);
    return live.match;
  }, [live.match, fixture, storedScore]);

  return {
    mode,
    loading: live.loading || ballsLoading,
    fixture,
    match,
    storedScore: storedScore ?? undefined,
    innings,
    selectedInnings,
    selectedInningsId,
    setSelectedInningsId,
    batters,
    bowlers,
    ballsByInnings,
    isLive: live.isLive,
    liveBalls: live.balls,
    liveBatters: live.batters,
    liveBowlers: live.bowlers,
    lastSixBalls: live.lastSixBalls,
    commentary: live.commentary,
    currentInnings: live.currentInnings,
  };
}
