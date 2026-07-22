"use client";

import { useEffect, useMemo, useState } from "react";
import type { Ball, CommentaryEntry, Innings, LiveMatchState, Match, Fixture } from "@/types";
import {
  subscribeToMatch,
  subscribeToInnings,
  subscribeToBalls,
  subscribeToCommentary,
  getInnings,
  getBalls,
} from "@/lib/firebase/firestore";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import {
  aggregateBatterScores,
  aggregateBowlerScores,
} from "@/lib/engine/statistics";
import { useFixtures } from "./use-tournament-data";

export interface UseLiveMatchResult extends LiveMatchState {
  loading: boolean;
  error: string | null;
  fixture?: Fixture;
  isLive: boolean;
  refresh: () => void;
}

function fixtureToMatch(fixture: Fixture): Match {
  return {
    id: fixture.matchDocId ?? fixture.id,
    fixtureId: fixture.id,
    matchId: fixture.matchId,
    stage: fixture.stage,
    status: fixture.status,
    date: fixture.date,
    startTime: fixture.startTime,
    ground: fixture.ground,
    overs: fixture.overs,
    teamAId: fixture.teamAId,
    teamBId: fixture.teamBId,
    teamAName: fixture.teamAName,
    teamBName: fixture.teamBName,
    playingXiA: [],
    playingXiB: [],
    locked: false,
    published: false,
    shareSlug: fixture.id,
    createdAt: "",
    updatedAt: "",
  };
}

export function useLiveMatch(matchId: string): UseLiveMatchResult {
  const { data: fixtures = [] } = useFixtures();
  const fixture = fixtures.find((f) => f.id === matchId || f.matchDocId === matchId);

  const [match, setMatch] = useState<Match | null>(null);
  const [inningsList, setInningsList] = useState<Innings[]>([]);
  const [balls, setBalls] = useState<Ball[]>([]);
  const [commentary, setCommentary] = useState<CommentaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const docId = fixture?.matchDocId ?? fixture?.id ?? matchId;
  const currentInnings = inningsList.find((i) => !i.completed) ?? inningsList[inningsList.length - 1];

  useEffect(() => {
    if (!fixture) {
      setLoading(false);
      return;
    }

    if (!isFirebaseConfigured()) {
      setMatch(fixtureToMatch(fixture));
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubs: (() => void)[] = [];

    unsubs.push(
      subscribeToMatch(docId, (m) => {
        setMatch(m ?? fixtureToMatch(fixture));
        setLoading(false);
      })
    );

    unsubs.push(
      subscribeToInnings(docId, (inn) => {
        setInningsList(inn);
        setLoading(false);
      })
    );

    unsubs.push(
      subscribeToCommentary(docId, (entries) => {
        setCommentary(entries);
      })
    );

    return () => unsubs.forEach((u) => u());
  }, [fixture, docId, tick]);

  useEffect(() => {
    if (!currentInnings?.id || !isFirebaseConfigured()) return;

    const unsub = subscribeToBalls(currentInnings.id, setBalls);
    return () => unsub();
  }, [currentInnings?.id]);

  useEffect(() => {
    if (currentInnings?.id || !fixture || isFirebaseConfigured()) return;
    getInnings(docId).then(setInningsList);
  }, [currentInnings?.id, fixture, docId]);

  useEffect(() => {
    if (!currentInnings?.id || isFirebaseConfigured()) return;
    getBalls(currentInnings.id).then(setBalls);
  }, [currentInnings?.id]);

  const batters = useMemo(() => aggregateBatterScores(balls), [balls]);
  const bowlers = useMemo(() => aggregateBowlerScores(balls), [balls]);
  const lastSixBalls = useMemo(() => balls.slice(-6), [balls]);

  const resolvedMatch = match ?? (fixture ? fixtureToMatch(fixture) : null);

  return {
    match: resolvedMatch ?? fixtureToMatch(fixture ?? {
      id: matchId,
      matchId,
      teamAId: "",
      teamBId: "",
      teamAName: "",
      teamBName: "",
      date: "",
      startTime: "",
      ground: "",
      stage: "round_1",
      overs: 20,
      status: "scheduled",
      order: 0,
    } as Fixture),
    innings: inningsList,
    currentInnings,
    balls,
    batters,
    bowlers,
    lastSixBalls,
    commentary,
    loading,
    error,
    fixture,
    isLive: resolvedMatch?.status === "live",
    refresh: () => setTick((t) => t + 1),
  };
}
