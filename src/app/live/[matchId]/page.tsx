"use client";

import { use } from "react";
import Link from "next/link";
import { Share2, Tv, Smartphone, Radio } from "lucide-react";
import { LiveScoreboard } from "@/components/scoreboard/live-scoreboard";
import { BallTimeline } from "@/components/scoreboard/ball-timeline";
import { CommentaryFeed } from "@/components/scoreboard/commentary-feed";
import { MatchScorecardView } from "@/components/scoreboard/match-scorecard-view";
import { useMatchScorecard } from "@/hooks/use-match-scorecard";
import { useLiveNotifications } from "@/hooks/use-live-notifications";
import { buildWormData, buildRunRateData } from "@/lib/engine/statistics";
import { getShareUrl } from "@/lib/utils";
import { ballsRemaining, runsNeeded } from "@/lib/engine/innings-metrics";

export default function LiveMatchPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = use(params);
  const scorecard = useMatchScorecard(matchId);
  const {
    fixture,
    match,
    mode,
    loading,
    isLive,
    innings,
    selectedInnings,
    selectedInningsId,
    setSelectedInningsId,
    batters,
    bowlers,
    liveBalls,
    liveBatters,
    liveBowlers,
    lastSixBalls,
    commentary,
    currentInnings,
  } = scorecard;

  useLiveNotifications(match?.id ?? matchId);

  const showScorecard = mode === "summary" || mode === "full";
  const showLiveDashboard = isLive && mode === "live";

  const liveInnings = currentInnings ?? selectedInnings;
  const wormData = buildWormData(liveBalls, fixture?.overs ?? 20);
  const runRateData = buildRunRateData(liveBalls, fixture?.overs ?? 20);
  const shareUrl = typeof window !== "undefined" ? getShareUrl(fixture?.id ?? matchId, fixture?.id ?? matchId) : "";
  const need = liveInnings && match.target ? runsNeeded(match, liveInnings) : undefined;
  const ballsLeft = liveInnings && fixture ? ballsRemaining(match, liveInnings) : undefined;

  if (loading && !fixture && innings.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center text-slate-500">
        Loading match…
      </div>
    );
  }

  if (!fixture) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <p className="text-slate-500">Match not found</p>
        <Link href="/fixtures" className="text-primary mt-4 inline-block">
          View Fixtures
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {isLive && <span className="live-badge">LIVE</span>}
            {showScorecard && !isLive && (
              <span className="text-xs font-semibold uppercase text-emerald-600">Completed</span>
            )}
            <p className="text-xs text-primary font-semibold uppercase">{fixture.matchId}</p>
          </div>
          <h1 className="text-2xl font-black">
            {fixture.teamAName} vs {fixture.teamBName}
          </h1>
          {showLiveDashboard && need != null && ballsLeft != null && (
            <p className="text-sm text-slate-500 mt-1">
              Need {need} runs from {ballsLeft} balls
            </p>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link
            href={`/match/${fixture.id}/scorecard`}
            className="flex items-center gap-2 px-4 py-2 rounded-lg glass-card text-sm"
          >
            Scorecard
          </Link>
          <Link
            href={`/match/${fixture.id}/tv`}
            className="flex items-center gap-2 px-4 py-2 rounded-lg glass-card text-sm"
          >
            <Tv className="w-4 h-4" /> TV
          </Link>
          <Link
            href={`/admin/matches/${fixture.id}/score`}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-sm"
          >
            <Smartphone className="w-4 h-4" /> Score
          </Link>
          <button
            type="button"
            onClick={() => navigator.share?.({ title: "Match Scorecard", url: shareUrl })}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm"
          >
            <Share2 className="w-4 h-4" /> Share
          </button>
        </div>
      </div>

      {showScorecard ? (
        <MatchScorecardView
          match={match}
          mode={mode}
          innings={innings}
          selectedInnings={selectedInnings}
          selectedInningsId={selectedInningsId}
          onSelectInnings={setSelectedInningsId}
          batters={batters}
          bowlers={bowlers}
        />
      ) : showLiveDashboard && liveInnings ? (
        <>
          <LiveScoreboard
            teamName={liveInnings.teamName}
            innings={liveInnings}
            target={match.target}
            matchOvers={fixture.overs}
            batters={liveBatters}
            bowlers={liveBowlers}
            lastSixBalls={lastSixBalls}
            wormData={wormData}
            runRateData={runRateData}
            winProbability={liveInnings.winProbability}
          />

          <div className="mt-6 grid lg:grid-cols-2 gap-4">
            <div className="glass-card p-4">
              <h4 className="font-semibold mb-3 text-sm uppercase tracking-wider text-slate-500">
                Ball Timeline
              </h4>
              <BallTimeline balls={liveBalls} max={24} size="md" />
            </div>
            <CommentaryFeed entries={commentary} />
          </div>
        </>
      ) : (
        <div className="glass-card p-10 text-center">
          <Radio className="w-10 h-10 mx-auto text-slate-400 mb-4" />
          <p className="text-slate-500">Match has not started yet</p>
          <p className="text-sm text-slate-400 mt-2">
            Scorer will begin live updates shortly
          </p>
        </div>
      )}
    </div>
  );
}
