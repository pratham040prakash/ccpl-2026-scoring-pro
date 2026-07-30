"use client";

import type { UseProfessionalScorecardResult } from "@/hooks/use-professional-scorecard";
import { aggregateBatterScores, aggregateBowlerScores } from "@/lib/engine/statistics";
import { inningsScoreLine } from "@/lib/match/scorecard-analytics";
import { CommentaryFeed } from "@/components/scoreboard/commentary-feed";
import { ScorecardHeader } from "./scorecard-header";
import { ScorecardSummary } from "./scorecard-summary";
import { ScorecardInningsTabs } from "./scorecard-innings-tabs";
import { ScorecardSection } from "./scorecard-section";
import { ScorecardBattingTable } from "./scorecard-batting-table";
import { ScorecardBowlingTable } from "./scorecard-bowling-table";
import { ScorecardFallOfWickets } from "./scorecard-fow";
import { ScorecardPartnerships } from "./scorecard-partnerships";
import { ScorecardOverByOver } from "./scorecard-over-by-over";
import { ScorecardBallTimeline } from "./scorecard-ball-timeline";
import { ScorecardMatchStats, ScorecardRunDistribution } from "./scorecard-stats";
import { ScorecardCharts } from "./scorecard-charts";
import { ScorecardPlayerOfMatch } from "./scorecard-pom";
import { ScorecardOfficials } from "./scorecard-officials";
import { ScorecardMatchNotes } from "./scorecard-notes";
import { ScorecardExportBar } from "./scorecard-export-bar";
import { BattingScorecardTable } from "@/components/scoreboard/batting-scorecard-table";

interface ProfessionalScorecardProps {
  data: UseProfessionalScorecardResult;
}

export function ProfessionalScorecard({ data }: ProfessionalScorecardProps) {
  const {
    fixture,
    match,
    isLive,
    innings,
    selectedInnings,
    selectedInningsId,
    setSelectedInningsId,
    inningsAnalytics,
    matchAnalytics,
    players,
    hasDetailedScorecard,
    visibleCommentary,
    hasMoreCommentary,
    loadMoreCommentary,
    currentInnings,
  } = data;

  if (!fixture || !selectedInnings) return null;

  const bowlingTeamName =
    selectedInnings.teamId === match.teamAId ? match.teamBName : match.teamAName;

  const exportBatters = hasDetailedScorecard
    ? inningsAnalytics!.batters
        .filter((b) => b.status !== "did_not_bat")
        .map((b) => ({
          playerId: b.playerId,
          playerName: b.playerName,
          runs: b.runs,
          balls: b.balls,
          fours: b.fours,
          sixes: b.sixes,
          strikeRate: b.strikeRate,
          isOut: b.isOut,
          dismissal: b.dismissal,
        }))
    : aggregateBatterScores(data.selectedBalls);

  const exportBowlers = aggregateBowlerScores(data.selectedBalls);

  return (
    <div className="space-y-4 scorecard-print-root">
      {isLive && selectedInnings && (
        <div className="lg:hidden sticky top-0 z-40 glass-card px-4 py-3 border-b border-primary/20">
          <p className="text-xs text-slate-500">{selectedInnings.teamName}</p>
          <p className="text-2xl font-black font-mono text-primary">
            {inningsScoreLine(selectedInnings)}
          </p>
        </div>
      )}

      <ScorecardHeader fixture={fixture} match={match} isLive={isLive} />

      <ScorecardExportBar
        match={match}
        fixtureId={fixture.id}
        innings={innings}
        batters={exportBatters}
        bowlers={exportBowlers}
      />

      <ScorecardSummary
        match={match}
        innings={innings}
        currentInnings={currentInnings ?? selectedInnings}
        target={match.target}
      />

      <ScorecardInningsTabs
        innings={innings}
        selectedId={selectedInningsId}
        onSelect={setSelectedInningsId}
      />

      {hasDetailedScorecard && inningsAnalytics ? (
        <>
          <ScorecardSection title="Batting Scorecard">
            <ScorecardBattingTable innings={selectedInnings} batters={inningsAnalytics.batters} />
          </ScorecardSection>

          <ScorecardSection title="Bowling Scorecard">
            <ScorecardBowlingTable teamName={bowlingTeamName} bowlers={inningsAnalytics.bowlers} />
          </ScorecardSection>

          <ScorecardSection title="Fall of Wickets" defaultOpen={false}>
            <ScorecardFallOfWickets rows={inningsAnalytics.fallOfWickets} />
          </ScorecardSection>

          <ScorecardSection title="Partnerships" defaultOpen={false}>
            <ScorecardPartnerships
              rows={inningsAnalytics.partnerships}
              highest={matchAnalytics?.highestPartnership ?? null}
            />
          </ScorecardSection>

          <ScorecardSection title="Over by Over" defaultOpen={false}>
            <ScorecardOverByOver overs={inningsAnalytics.overs} />
          </ScorecardSection>

          <ScorecardSection title="Ball by Ball">
            <ScorecardBallTimeline balls={data.selectedBalls} />
          </ScorecardSection>

          <ScorecardSection title="Match Statistics" defaultOpen={false}>
            <ScorecardMatchStats innings={inningsAnalytics} matchStats={matchAnalytics} />
          </ScorecardSection>

          <ScorecardSection title="Run Distribution" defaultOpen={false}>
            <ScorecardRunDistribution distribution={inningsAnalytics.runDistribution} />
          </ScorecardSection>

          <ScorecardSection title="Match Graphs" defaultOpen={false}>
            <ScorecardCharts
              analytics={inningsAnalytics}
              winProbability={selectedInnings.winProbability}
              projectedScore={selectedInnings.projectedScore}
            />
          </ScorecardSection>
        </>
      ) : (
        <ScorecardSection title="Innings Summary">
          <BattingScorecardTable
            innings={selectedInnings}
            batters={[]}
            showPlayerDetail={false}
          />
        </ScorecardSection>
      )}

      {(match.playerOfMatchId || matchAnalytics?.playerOfMatch) && (
        <ScorecardSection title="Player of the Match">
          <ScorecardPlayerOfMatch match={match} analytics={matchAnalytics} players={players} />
        </ScorecardSection>
      )}

      <ScorecardSection title="Match Officials" defaultOpen={false}>
        <ScorecardOfficials match={match} />
      </ScorecardSection>

      <ScorecardSection title="Match Notes" defaultOpen={false}>
        <ScorecardMatchNotes match={match} />
      </ScorecardSection>

      {visibleCommentary.length > 0 && (
        <ScorecardSection title="Commentary">
          <CommentaryFeed entries={visibleCommentary} maxHeight="32rem" />
          {hasMoreCommentary && (
            <div className="p-4 border-t border-slate-200/40 dark:border-slate-700/40">
              <button
                type="button"
                onClick={loadMoreCommentary}
                className="text-sm font-semibold text-primary hover:underline"
              >
                Load more commentary
              </button>
            </div>
          )}
        </ScorecardSection>
      )}
    </div>
  );
}
