"use client";

import type { Ball, BatterScore, BowlerScore, Innings } from "@/types";
import type { RosterPlayer } from "@/lib/live/player-roster";
import { strikeRate } from "@/lib/utils";
import { CreaseSlot } from "@/components/scorer/player-cards";
import { BattingLineupPanel } from "@/components/scorer/batting-lineup-panel";
import { BowlingRotationPanel } from "@/components/scorer/bowling-rotation-panel";
import { QuickActionsBar } from "@/components/scorer/quick-actions-bar";
import { BallTimelineStrip } from "@/components/scoreboard/ball-timeline";
import {
  getNextSuggestedBatter,
  getPreviousOverBowlerId,
  isCaptain,
} from "@/lib/live/participant-selection";

interface ParticipantWorkspaceProps {
  innings: Innings;
  matchOvers: number;
  battingXi: RosterPlayer[];
  bowlingXi: RosterPlayer[];
  battingTeamName: string;
  bowlingTeamName: string;
  batters: BatterScore[];
  bowlers: BowlerScore[];
  balls: Ball[];
  order: string[];
  outIds: Set<string>;
  busy?: boolean;
  lineupCollapsed: boolean;
  onToggleLineup: () => void;
  onReorder: (order: string[]) => void;
  onOpenPick: (mode: "striker" | "non_striker" | "bowler") => void;
  onUndo: () => void;
  onSwapStrike: () => void;
  onNextBatter: () => void;
  onRecentBowler: () => void;
}

export function ParticipantWorkspace({
  innings,
  matchOvers,
  battingXi,
  bowlingXi,
  battingTeamName,
  bowlingTeamName,
  batters,
  bowlers,
  balls,
  order,
  outIds,
  busy,
  lineupCollapsed,
  onToggleLineup,
  onReorder,
  onOpenPick,
  onUndo,
  onSwapStrike,
  onNextBatter,
  onRecentBowler,
}: ParticipantWorkspaceProps) {
  const striker = batters.find((b) => b.playerId === innings.strikerId);
  const nonStriker = batters.find((b) => b.playerId === innings.nonStrikerId);
  const bowler = bowlers.find((b) => b.playerId === innings.bowlerId);

  const strikerName =
    striker?.playerName ??
    battingXi.find((p) => p.id === innings.strikerId)?.name;
  const nonStrikerName =
    nonStriker?.playerName ??
    battingXi.find((p) => p.id === innings.nonStrikerId)?.name;
  const bowlerName =
    bowler?.playerName ?? bowlingXi.find((p) => p.id === innings.bowlerId)?.name;

  const nextBatter = getNextSuggestedBatter(battingXi, order, {
    outIds,
    strikerId: innings.strikerId,
    nonStrikerId: innings.nonStrikerId,
  });

  const prevBowlerId = getPreviousOverBowlerId(balls);
  const recentBowlerName = bowlingXi.find((p) => p.id === prevBowlerId)?.name;

  const editableLineup = balls.length === 0;

  const isBattingCaptain = (p: RosterPlayer) => isCaptain(p, battingTeamName);
  const isBowlingCaptain = (p: RosterPlayer) => isCaptain(p, bowlingTeamName);

  const strikerStats = striker
    ? `${striker.runs} (${striker.balls}) · SR ${strikeRate(striker.runs, striker.balls)}`
    : undefined;
  const nonStrikerStats = nonStriker
    ? `${nonStriker.runs} (${nonStriker.balls}) · SR ${strikeRate(nonStriker.runs, nonStriker.balls)}`
    : undefined;
  const bowlerStats = bowler
    ? `${Math.floor(bowler.balls / 6)}.${bowler.balls % 6}-${bowler.runs}-${bowler.wickets}`
    : undefined;

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-3 gap-3">
        <CreaseSlot
          label="Striker *"
          name={strikerName}
          stats={strikerStats}
          accent="emerald"
          emptyLabel="Tap to set striker"
          onTap={() => onOpenPick("striker")}
        />
        <CreaseSlot
          label="Non-Striker"
          name={nonStrikerName}
          stats={nonStrikerStats}
          accent="blue"
          emptyLabel="Tap to set non-striker"
          onTap={() => onOpenPick("non_striker")}
        />
        <CreaseSlot
          label="Bowler"
          name={bowlerName}
          stats={bowlerStats}
          accent="purple"
          emptyLabel="Tap to set bowler"
          onTap={() => onOpenPick("bowler")}
        />
      </div>

      <QuickActionsBar
        disabled={busy}
        onUndo={onUndo}
        onSwapStrike={onSwapStrike}
        onNextBatter={onNextBatter}
        onRecentBowler={onRecentBowler}
        nextBatterName={nextBatter?.name}
        recentBowlerName={recentBowlerName}
      />

      <div className="grid lg:grid-cols-2 gap-4">
        <BattingLineupPanel
          battingXi={battingXi}
          order={order}
          batters={batters}
          strikerId={innings.strikerId}
          nonStrikerId={innings.nonStrikerId}
          outIds={outIds}
          teamName={battingTeamName}
          isCaptain={isBattingCaptain}
          editable={editableLineup}
          collapsed={lineupCollapsed}
          onToggleCollapse={onToggleLineup}
          onReorder={onReorder}
          onPickBatter={(p) => {
            if (p.id === innings.nonStrikerId) onOpenPick("non_striker");
            else onOpenPick("striker");
          }}
        />
        <div className="space-y-4">
          <BowlingRotationPanel
            bowlingXi={bowlingXi}
            bowlers={bowlers}
            balls={balls}
            currentBowlerId={innings.bowlerId}
            matchOvers={matchOvers}
            isCaptain={isBowlingCaptain}
            onPickBowler={() => onOpenPick("bowler")}
          />
          <div className="glass-card p-4">
            <h4 className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-2">
              This over
            </h4>
            <BallTimelineStrip balls={balls} />
          </div>
        </div>
      </div>
    </div>
  );
}
