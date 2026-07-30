"use client";

import { useEffect, useMemo, useState } from "react";
import type { Ball, CommentaryEntry, Player } from "@/types";
import { getPlayers } from "@/lib/firebase/firestore";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import {
  allBallsFlat,
  buildInningsAnalytics,
  buildMatchAnalytics,
  type InningsAnalytics,
  type MatchAnalytics,
} from "@/lib/match/scorecard-analytics";
import { useMatchScorecard, type UseMatchScorecardResult } from "./use-match-scorecard";
import { useRealtimeInningsBalls } from "./use-realtime-innings-balls";

const COMMENTARY_PAGE = 30;

export interface UseProfessionalScorecardResult extends UseMatchScorecardResult {
  realtimeBallsByInnings: Record<string, Ball[]>;
  selectedBalls: Ball[];
  allBalls: Ball[];
  inningsAnalytics: InningsAnalytics | null;
  matchAnalytics: MatchAnalytics | null;
  players: Player[];
  visibleCommentary: CommentaryEntry[];
  commentaryPage: number;
  loadMoreCommentary: () => void;
  hasMoreCommentary: boolean;
  hasDetailedScorecard: boolean;
}

export function useProfessionalScorecard(fixtureId: string): UseProfessionalScorecardResult {
  const base = useMatchScorecard(fixtureId);
  const realtimeBallsByInnings = useRealtimeInningsBalls(base.innings);

  const ballsByInnings = useMemo(() => {
    const merged: Record<string, Ball[]> = { ...base.ballsByInnings };
    for (const [id, balls] of Object.entries(realtimeBallsByInnings)) {
      if (balls.length > 0) merged[id] = balls;
    }
    if (base.currentInnings?.id && base.liveBalls.length > 0) {
      merged[base.currentInnings.id] = base.liveBalls;
    }
    return merged;
  }, [base.ballsByInnings, realtimeBallsByInnings, base.currentInnings?.id, base.liveBalls]);

  const selectedBalls = base.selectedInnings
    ? ballsByInnings[base.selectedInnings.id] ?? []
    : [];

  const allBalls = useMemo(() => allBallsFlat(ballsByInnings), [ballsByInnings]);

  const [players, setPlayers] = useState<Player[]>([]);

  useEffect(() => {
    if (!isFirebaseConfigured() || !base.match) return;
    const teamIds = [base.match.teamAId, base.match.teamBId].filter(Boolean);
    void Promise.all(teamIds.map((id) => getPlayers(id))).then((lists) => {
      setPlayers(lists.flat());
    });
  }, [base.match?.teamAId, base.match?.teamBId, base.match]);

  const maxOvers = base.fixture?.overs ?? base.match?.overs ?? 20;

  const inningsAnalytics = useMemo(() => {
    if (!base.selectedInnings) return null;
    return buildInningsAnalytics(
      selectedBalls,
      base.selectedInnings,
      base.match,
      players,
      maxOvers
    );
  }, [selectedBalls, base.selectedInnings, base.match, players, maxOvers]);

  const matchAnalytics = useMemo(() => {
    if (allBalls.length === 0) return null;
    return buildMatchAnalytics(allBalls, base.innings, base.match);
  }, [allBalls, base.innings, base.match]);

  const [commentaryPage, setCommentaryPage] = useState(1);

  useEffect(() => {
    setCommentaryPage(1);
  }, [fixtureId, base.selectedInningsId]);

  const visibleCommentary = useMemo(
    () => base.commentary.slice(0, commentaryPage * COMMENTARY_PAGE),
    [base.commentary, commentaryPage]
  );

  const hasMoreCommentary = visibleCommentary.length < base.commentary.length;
  const hasDetailedScorecard = selectedBalls.length > 0;

  return {
    ...base,
    realtimeBallsByInnings,
    selectedBalls,
    allBalls,
    inningsAnalytics,
    matchAnalytics,
    players,
    visibleCommentary,
    commentaryPage,
    loadMoreCommentary: () => setCommentaryPage((p) => p + 1),
    hasMoreCommentary,
    hasDetailedScorecard,
  };
}
