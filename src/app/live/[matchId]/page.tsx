"use client";

import { use } from "react";
import Link from "next/link";
import { Share2, Tv, Smartphone, Radio } from "lucide-react";
import { LiveScoreboard } from "@/components/scoreboard/live-scoreboard";
import { BallTimeline } from "@/components/scoreboard/ball-timeline";
import { CommentaryFeed } from "@/components/scoreboard/commentary-feed";
import { useLiveMatch } from "@/hooks/use-live-match";
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
  const live = useLiveMatch(matchId);
  useLiveNotifications(matchId);
  const { fixture, match, currentInnings, balls, batters, bowlers, lastSixBalls, commentary, loading } = live;

  if (loading && !currentInnings) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center text-slate-500">
        Connecting to live score…
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

  const wormData = buildWormData(balls, fixture.overs);
  const runRateData = buildRunRateData(balls, fixture.overs);
  const shareUrl = typeof window !== "undefined" ? getShareUrl(fixture.id, fixture.id) : "";
  const need = currentInnings && match.target ? runsNeeded(match, currentInnings) : undefined;
  const ballsLeft = currentInnings ? ballsRemaining(match, currentInnings) : undefined;

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {live.isLive && <span className="live-badge">LIVE</span>}
            <p className="text-xs text-primary font-semibold uppercase">
              {fixture.matchId}
            </p>
          </div>
          <h1 className="text-2xl font-black">
            {fixture.teamAName} vs {fixture.teamBName}
          </h1>
          {need != null && ballsLeft != null && (
            <p className="text-sm text-slate-500 mt-1">
              Need {need} runs from {ballsLeft} balls
            </p>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
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
            onClick={() => navigator.share?.({ title: "Live Score", url: shareUrl })}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm"
          >
            <Share2 className="w-4 h-4" /> Share
          </button>
        </div>
      </div>

      {!currentInnings ? (
        <div className="glass-card p-10 text-center">
          <Radio className="w-10 h-10 mx-auto text-slate-400 mb-4" />
          <p className="text-slate-500">Match has not started yet</p>
          <p className="text-sm text-slate-400 mt-2">
            Scorer will begin live updates shortly
          </p>
        </div>
      ) : (
        <>
          <LiveScoreboard
            teamName={currentInnings.teamName}
            innings={currentInnings}
            target={match.target}
            matchOvers={fixture.overs}
            batters={batters}
            bowlers={bowlers}
            lastSixBalls={lastSixBalls}
            wormData={wormData}
            runRateData={runRateData}
            winProbability={currentInnings.winProbability}
          />

          <div className="mt-6 grid lg:grid-cols-2 gap-4">
            <div className="glass-card p-4">
              <h4 className="font-semibold mb-3 text-sm uppercase tracking-wider text-slate-500">
                Ball Timeline
              </h4>
              <BallTimeline balls={balls} max={24} size="md" />
            </div>
            <CommentaryFeed entries={commentary} />
          </div>
        </>
      )}
    </div>
  );
}
