"use client";

import { use, useState } from "react";
import Link from "next/link";
import { Share2, Tv, Smartphone, Radio } from "lucide-react";
import { LiveScoreboard } from "@/components/scoreboard/live-scoreboard";
import { BallTimeline } from "@/components/scoreboard/ball-timeline";
import { CommentaryFeed } from "@/components/scoreboard/commentary-feed";
import { WormChart, RunRateChart } from "@/components/scoreboard/charts";
import { PageContainer, PageHeader } from "@/components/layout/page-container";
import { ResponsiveTabs } from "@/components/ui/responsive-tabs";
import { useLiveMatch } from "@/hooks/use-live-match";
import { useLiveNotifications } from "@/hooks/use-live-notifications";
import { buildWormData, buildRunRateData } from "@/lib/engine/statistics";
import { formatOvers, getShareUrl } from "@/lib/utils";
import { ballsRemaining, runsNeeded } from "@/lib/engine/innings-metrics";

const TABS = [
  { id: "summary", label: "Summary" },
  { id: "scorecard", label: "Scorecard" },
  { id: "commentary", label: "Commentary" },
  { id: "graphs", label: "Graphs" },
];

export default function LiveMatchPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = use(params);
  const live = useLiveMatch(matchId);
  useLiveNotifications(matchId);
  const [tab, setTab] = useState("summary");
  const { fixture, match, currentInnings, balls, batters, bowlers, lastSixBalls, commentary, loading } = live;

  if (loading && !currentInnings) {
    return (
      <PageContainer className="py-20 text-center text-slate-500">
        Connecting to live score…
      </PageContainer>
    );
  }

  if (!fixture) {
    return (
      <PageContainer className="py-20 text-center">
        <p className="text-slate-500">Match not found</p>
        <Link href="/fixtures" className="text-primary mt-4 inline-block">
          View Fixtures
        </Link>
      </PageContainer>
    );
  }

  const wormData = buildWormData(balls, fixture.overs);
  const runRateData = buildRunRateData(balls, fixture.overs);
  const shareUrl = typeof window !== "undefined" ? getShareUrl(fixture.id, fixture.id) : "";
  const need = currentInnings && match.target ? runsNeeded(match, currentInnings) : undefined;
  const ballsLeft = currentInnings ? ballsRemaining(match, currentInnings) : undefined;

  const scoreboardProps = currentInnings
    ? {
        teamName: currentInnings.teamName,
        innings: currentInnings,
        target: match.target,
        matchOvers: fixture.overs,
        batters,
        bowlers,
        lastSixBalls,
        wormData,
        runRateData,
        winProbability: currentInnings.winProbability,
      }
    : null;

  return (
    <PageContainer size="lg" className="py-4 sm:py-8">
      <div className="hidden lg:block">
        <PageHeader
          title={`${fixture.teamAName} vs ${fixture.teamBName}`}
          subtitle={need != null ? `Need ${need} runs from ${ballsLeft} balls` : fixture.matchId}
          badge={live.isLive ? <span className="live-badge mb-2">LIVE</span> : undefined}
          actions={
            <>
              <Link href={`/match/${fixture.id}/tv`} className="flex items-center gap-2 px-4 py-2 rounded-xl glass-card text-sm min-h-[44px]">
                <Tv className="w-4 h-4" /> TV
              </Link>
              <Link href={`/admin/matches/${fixture.id}/score`} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-white text-sm min-h-[44px]">
                <Smartphone className="w-4 h-4" /> Score
              </Link>
              <button
                type="button"
                onClick={() => navigator.share?.({ title: "Live Score", url: shareUrl })}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm min-h-[44px]"
              >
                <Share2 className="w-4 h-4" /> Share
              </button>
            </>
          }
        />
      </div>

      {!currentInnings || !scoreboardProps ? (
        <div className="glass-card p-10 text-center">
          <Radio className="w-10 h-10 mx-auto text-slate-400 mb-4" />
          <p className="text-slate-500">Match has not started yet</p>
        </div>
      ) : (
        <>
          <div className="lg:hidden sticky top-14 z-30 -mx-4 px-4 py-3 glass-card rounded-none border-x-0 border-t-0 mb-4">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                {live.isLive && <span className="live-badge mb-1">LIVE</span>}
                <p className="score-display-xl text-foreground">
                  {currentInnings.runs}/{currentInnings.wickets}
                </p>
                <p className="text-xs text-slate-500">
                  {formatOvers(currentInnings.overs, currentInnings.balls)} ov · CRR {currentInnings.runRate.toFixed(2)}
                </p>
              </div>
              {need != null && (
                <p className="text-xs text-right text-slate-500 shrink-0">
                  Need {need}
                  <br />
                  off {ballsLeft} balls
                </p>
              )}
            </div>
          </div>

          <div className="lg:hidden mb-4">
            <ResponsiveTabs tabs={TABS} active={tab} onChange={setTab} />
          </div>

          <div className="lg:hidden space-y-4">
            {(tab === "summary" || tab === "scorecard") && (
              <LiveScoreboard {...scoreboardProps} compact={tab === "summary"} />
            )}
            {tab === "commentary" && <CommentaryFeed entries={commentary} maxHeight="70vh" />}
            {tab === "graphs" && (
              <div className="space-y-4">
                <div className="glass-card p-4 overflow-x-auto">
                  <WormChart data={wormData} />
                </div>
                <div className="glass-card p-4 overflow-x-auto">
                  <RunRateChart data={runRateData} />
                </div>
                <div className="glass-card p-4">
                  <h4 className="font-semibold mb-3 text-sm">Ball Timeline</h4>
                  <BallTimeline balls={balls} max={24} />
                </div>
              </div>
            )}
          </div>

          <div className="hidden lg:block live-split-main">
            <div className="space-y-4 min-w-0">
              <LiveScoreboard {...scoreboardProps} />
              <div className="grid lg:grid-cols-2 gap-4">
                <div className="glass-card p-4">
                  <h4 className="font-semibold mb-3 text-sm uppercase tracking-wider text-slate-500">
                    Ball Timeline
                  </h4>
                  <BallTimeline balls={balls} max={24} size="md" />
                </div>
                <CommentaryFeed entries={commentary} />
              </div>
            </div>

            <aside className="space-y-4 sticky top-20">
              <div className="glass-card p-4">
                <h4 className="text-xs uppercase tracking-wider text-slate-500 mb-3">Partnership</h4>
                <p className="text-2xl font-black">
                  {currentInnings.partnership?.runs ?? 0}
                  <span className="text-sm font-normal text-slate-500 ml-2">
                    ({currentInnings.partnership?.balls ?? 0} balls)
                  </span>
                </p>
              </div>
              <div className="glass-card p-4">
                <h4 className="text-xs uppercase tracking-wider text-slate-500 mb-3">At the crease</h4>
                {batters.filter((b) => !b.isOut).slice(0, 2).map((b) => (
                  <p key={b.playerId} className="text-sm py-1">
                    <span className="font-semibold">{b.playerName}</span> {b.runs} ({b.balls})
                  </p>
                ))}
              </div>
              <div className="glass-card p-4">
                <h4 className="text-xs uppercase tracking-wider text-slate-500 mb-3">Bowler</h4>
                {bowlers[0] && (
                  <p className="text-sm font-semibold">
                    {bowlers[0].playerName}{" "}
                    <span className="font-mono text-slate-500">
                      {Math.floor(bowlers[0].balls / 6)}.{bowlers[0].balls % 6}-{bowlers[0].runs}-{bowlers[0].wickets}
                    </span>
                  </p>
                )}
              </div>
            </aside>
          </div>
        </>
      )}
    </PageContainer>
  );
}
