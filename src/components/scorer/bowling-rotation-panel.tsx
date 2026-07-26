"use client";

import { useMemo } from "react";
import type { Ball, BowlerScore } from "@/types";
import type { RosterPlayer } from "@/lib/live/player-roster";
import {
  getBowlerDisplayStats,
  maxOversPerBowler,
  suggestBowler,
} from "@/lib/live/participant-selection";
import { cn } from "@/lib/utils";
import { PlayerAvatar } from "@/components/scorer/player-avatar";

interface BowlingRotationPanelProps {
  bowlingXi: RosterPlayer[];
  bowlers: BowlerScore[];
  balls: Ball[];
  currentBowlerId?: string;
  matchOvers: number;
  isCaptain: (p: RosterPlayer) => boolean;
  onPickBowler?: (player: RosterPlayer) => void;
}

export function BowlingRotationPanel({
  bowlingXi,
  bowlers,
  balls,
  currentBowlerId,
  matchOvers,
  isCaptain,
  onPickBowler,
}: BowlingRotationPanelProps) {
  const maxOvers = maxOversPerBowler(matchOvers);
  const suggestion = suggestBowler(bowlingXi, bowlers, balls, currentBowlerId, matchOvers);

  const rows = useMemo(() => {
    const statMap = new Map(bowlers.map((b) => [b.playerId, b]));
    return bowlingXi.map((player) => {
      const stat = statMap.get(player.id) ?? {
        playerId: player.id,
        playerName: player.name,
        overs: 0,
        balls: 0,
        maidens: 0,
        runs: 0,
        wickets: 0,
        economy: 0,
      };
      const display = getBowlerDisplayStats(stat, balls, matchOvers);
      const atLimit = stat.balls >= maxOvers * 6;
      const isCurrent = player.id === currentBowlerId;
      const isSuggested = suggestion?.playerId === player.id;
      return { player, stat, display, atLimit, isCurrent, isSuggested };
    });
  }, [bowlingXi, bowlers, balls, matchOvers, maxOvers, currentBowlerId, suggestion]);

  return (
    <div className="glass-card p-4">
      <h4 className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-3">
        Bowling Rotation · max {maxOvers} ov each
      </h4>
      <div className="space-y-2">
        {rows.map(({ player, stat, display, atLimit, isCurrent, isSuggested }) => (
          <button
            key={player.id}
            type="button"
            disabled={atLimit && !isCurrent}
            onClick={() => onPickBowler?.(player)}
            className={cn(
              "w-full flex items-center gap-3 p-3 rounded-xl border text-left min-h-[60px] transition-all",
              isCurrent && "border-purple-400 bg-purple-500/15 ring-1 ring-purple-400/50",
              isSuggested && !isCurrent && "border-emerald-400/40 bg-emerald-500/5",
              !isCurrent && !isSuggested && "border-white/5 bg-slate-900/30 hover:border-purple-400/30",
              atLimit && !isCurrent && "opacity-40"
            )}
          >
            <PlayerAvatar name={player.name} size="sm" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm truncate">{player.name}</span>
                {isCaptain(player) && (
                  <span className="text-[10px] text-amber-400">(C)</span>
                )}
                {isCurrent && (
                  <span className="text-[10px] px-1.5 rounded-full bg-purple-500/40">Bowling</span>
                )}
                {isSuggested && !isCurrent && (
                  <span className="text-[10px] px-1.5 rounded-full bg-emerald-500/30">Pick</span>
                )}
              </div>
              <p className="text-xs text-slate-400 tabular-nums mt-0.5">
                {display.oversLabel}-{stat.runs}-{stat.wickets} · Econ {display.economy.toFixed(1)} ·{" "}
                {display.dots} dots · {display.oversLeft} left
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
