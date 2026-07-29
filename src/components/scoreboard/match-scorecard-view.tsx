import type { BatterScore, BowlerScore, Innings, Match } from "@/types";
import type { ScorecardMode } from "@/lib/match/match-scorecard";
import { MatchResultBanner } from "./match-result-banner";
import { InningsTabs } from "./innings-tabs";
import { BattingScorecardTable } from "./batting-scorecard-table";
import { BowlingScorecardTable } from "./bowling-scorecard-table";

interface MatchScorecardViewProps {
  match: Match;
  mode: ScorecardMode;
  innings: Innings[];
  selectedInnings?: Innings;
  selectedInningsId: string | null;
  onSelectInnings: (id: string) => void;
  batters: BatterScore[];
  bowlers: BowlerScore[];
}

export function MatchScorecardView({
  match,
  mode,
  innings,
  selectedInnings,
  selectedInningsId,
  onSelectInnings,
  batters,
  bowlers,
}: MatchScorecardViewProps) {
  if (!selectedInnings) return null;

  const showPlayerDetail = mode === "full" && batters.length > 0;
  const bowlingTeamName =
    selectedInnings.teamId === match.teamAId ? match.teamBName : match.teamAName;

  return (
    <div className="space-y-4">
      <MatchResultBanner match={match} />

      <InningsTabs
        innings={innings}
        selectedId={selectedInningsId}
        onSelect={onSelectInnings}
      />

      <BattingScorecardTable
        innings={selectedInnings}
        batters={batters}
        showPlayerDetail={showPlayerDetail}
      />

      {showPlayerDetail && (
        <BowlingScorecardTable teamName={bowlingTeamName} bowlers={bowlers} />
      )}
    </div>
  );
}
