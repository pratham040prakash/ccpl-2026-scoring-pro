"use client";

import { use, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Share2, QrCode, Tv, Smartphone } from "lucide-react";
import { LiveScoreboard } from "@/components/scoreboard/live-scoreboard";
import { useFixtures } from "@/hooks/use-tournament-data";
import { DEMO_DATA } from "@/lib/seed";
import type { Innings, Ball, ScoringAction } from "@/types";
import { generateId, getShareUrl } from "@/lib/utils";
import { aggregateBatterScores, aggregateBowlerScores, buildWormData, buildRunRateData } from "@/lib/engine/statistics";
import { scoreBall } from "@/lib/engine/scoring";
import { predictMatchOutcome } from "@/lib/engine/ai";

export default function LiveMatchPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = use(params);
  const { data: fixtures = [] } = useFixtures();
  const fixture = fixtures.find((f) => f.id === matchId || f.matchDocId === matchId);

  const [innings, setInnings] = useState<Innings | null>(null);
  const [balls, setBalls] = useState<Ball[]>([]);
  const [sequence, setSequence] = useState(0);

  useEffect(() => {
    if (!fixture) return;
    const now = new Date().toISOString();
    setInnings({
      id: generateId("inn"),
      matchId: fixture.id,
      teamId: fixture.teamAId,
      teamName: fixture.teamAName,
      inningsNumber: 1,
      runs: 0,
      wickets: 0,
      overs: 0,
      balls: 0,
      extras: { total: 0, wides: 0, noBalls: 0, byes: 0, legByes: 0, penalty: 0 },
      runRate: 0,
      partnership: { runs: 0, balls: 0, batsman1Id: "", batsman2Id: "", batsman1Runs: 0, batsman2Runs: 0 },
      completed: false,
      createdAt: now,
      updatedAt: now,
    });
  }, [fixture]);

  const handleScore = useCallback(
    (action: ScoringAction) => {
      if (!innings || !fixture) return;

      const mockMatch = {
        id: fixture.id,
        fixtureId: fixture.id,
        matchId: fixture.matchId,
        stage: fixture.stage,
        status: "live" as const,
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

      const result = scoreBall({
        match: mockMatch,
        innings,
        strikerId: "b1",
        strikerName: "Striker",
        nonStrikerId: "b2",
        nonStrikerName: "Non-Striker",
        bowlerId: "bw1",
        bowlerName: "Bowler",
        action,
        sequence,
      });

      setBalls((prev) => [...prev, result.ball]);
      setInnings((prev) => (prev ? { ...prev, ...result.updatedInnings, updatedAt: new Date().toISOString() } : null));
      setSequence((s) => s + 1);
    },
    [innings, fixture, sequence]
  );

  if (!fixture) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <p className="text-slate-500">Match not found</p>
        <Link href="/fixtures" className="text-primary mt-4 inline-block">View Fixtures</Link>
      </div>
    );
  }

  const batters = aggregateBatterScores(balls);
  const bowlers = aggregateBowlerScores(balls);
  const wormData = buildWormData(balls, fixture.overs);
  const runRateData = buildRunRateData(balls, fixture.overs);
  const prediction = innings
    ? predictMatchOutcome(innings.runs, innings.wickets, innings.overs, innings.balls, 80, fixture.overs)
    : null;

  const shareUrl = typeof window !== "undefined" ? getShareUrl(fixture.id, fixture.id) : "";

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <p className="text-xs text-primary font-semibold uppercase">{fixture.matchId} · LIVE</p>
          <h1 className="text-2xl font-black">{fixture.teamAName} vs {fixture.teamBName}</h1>
        </div>
        <div className="flex gap-2">
          <Link href={`/match/${fixture.id}/tv`} className="flex items-center gap-2 px-4 py-2 rounded-lg glass-card text-sm">
            <Tv className="w-4 h-4" /> TV
          </Link>
          <Link href={`/match/${fixture.id}/score/mobile`} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-sm">
            <Smartphone className="w-4 h-4" /> Score
          </Link>
          <button
            onClick={() => navigator.share?.({ title: "Live Score", url: shareUrl })}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm"
          >
            <Share2 className="w-4 h-4" /> Share
          </button>
        </div>
      </div>

      <LiveScoreboard
        teamName={innings?.teamName || fixture.teamAName}
        innings={innings || undefined}
        batters={batters}
        bowlers={bowlers}
        lastSixBalls={balls}
        wormData={wormData}
        runRateData={runRateData}
        winProbability={prediction?.winnerProb}
      />

      {prediction && (
        <div className="mt-6 glass-card p-4">
          <p className="text-sm font-bold">AI Prediction</p>
          <p className="text-slate-500 text-sm">{prediction.prediction} · {prediction.confidence}% confidence</p>
        </div>
      )}
    </div>
  );
}
