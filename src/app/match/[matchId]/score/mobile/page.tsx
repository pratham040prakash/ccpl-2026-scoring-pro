"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { MobileScorer } from "@/components/scorer/mobile-scorer";
import { useFixtures } from "@/hooks/use-tournament-data";
import type { Innings, Ball, ScoringAction } from "@/types";
import { generateId, formatOvers } from "@/lib/utils";
import { scoreBall, undoBall } from "@/lib/engine/scoring";
import { queueOfflineAction, isOnline } from "@/lib/offline/store";

export default function MobileScorerPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = use(params);
  const { data: fixtures = [] } = useFixtures();
  const fixture = fixtures.find((f) => f.id === matchId);
  const [innings, setInnings] = useState<Innings | null>(null);
  const [balls, setBalls] = useState<Ball[]>([]);
  const [sequence, setSequence] = useState(0);
  const [offline, setOffline] = useState(false);

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

  useEffect(() => {
    const check = async () => setOffline(!(await isOnline()));
    check();
    window.addEventListener("online", check);
    window.addEventListener("offline", check);
    return () => {
      window.removeEventListener("online", check);
      window.removeEventListener("offline", check);
    };
  }, []);

  const mockMatch = fixture
    ? {
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
      }
    : null;

  const handleScore = useCallback(
    async (action: ScoringAction) => {
      if (!innings || !mockMatch) return;

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
      setInnings((prev) =>
        prev ? { ...prev, ...result.updatedInnings, updatedAt: new Date().toISOString() } : null
      );
      setSequence((s) => s + 1);

      if (offline) {
        await queueOfflineAction({
          id: generateId("pending"),
          matchId: fixture!.id,
          inningsId: innings.id,
          action,
          strikerId: "b1",
          strikerName: "Striker",
          nonStrikerId: "b2",
          nonStrikerName: "Non-Striker",
          bowlerId: "bw1",
          bowlerName: "Bowler",
          sequence,
          createdAt: new Date().toISOString(),
          synced: false,
        });
      }
    },
    [innings, mockMatch, sequence, offline, fixture]
  );

  const handleUndo = useCallback(() => {
    if (balls.length === 0 || !innings) return;
    const lastBall = balls[balls.length - 1];
    const updated = undoBall(innings, lastBall);
    setBalls((prev) => prev.slice(0, -1));
    setInnings((prev) => (prev ? { ...prev, ...updated } : null));
    setSequence((s) => s - 1);
  }, [balls, innings]);

  if (!fixture || !innings) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        Loading scorer...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Score strip */}
      <div className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <Link href={`/live/${fixture.id}`} className="p-2">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="text-center">
            <p className="text-xs text-slate-400">{fixture.matchId}</p>
            <p className="text-2xl font-black tabular-nums">
              {innings.runs}/{innings.wickets}
              <span className="text-sm font-normal text-slate-400 ml-2">
                ({formatOvers(innings.overs, innings.balls)})
              </span>
            </p>
          </div>
          <div className="text-right">
            {offline && (
              <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-1 rounded-full">
                Offline
              </span>
            )}
          </div>
        </div>
      </div>

      <MobileScorer
        onScore={handleScore}
        onUndo={handleUndo}
        currentOver={formatOvers(innings.overs, innings.balls)}
      />
    </div>
  );
}
