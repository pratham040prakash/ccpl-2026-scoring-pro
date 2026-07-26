"use client";

import { useMemo } from "react";
import { GripVertical, ChevronDown, ChevronUp } from "lucide-react";
import type { BatterScore } from "@/types";
import type { RosterPlayer } from "@/lib/live/player-roster";
import {
  getBattingStatus,
  sortBattersByOrder,
  getNextSuggestedBatter,
  buildBatterCardStats,
  type PlayerBattingStatus,
} from "@/lib/live/participant-selection";
import { cn, strikeRate } from "@/lib/utils";
import { PlayerAvatar } from "@/components/scorer/player-avatar";

interface BattingLineupPanelProps {
  battingXi: RosterPlayer[];
  order: string[];
  batters: BatterScore[];
  strikerId?: string;
  nonStrikerId?: string;
  outIds: Set<string>;
  teamName: string;
  isCaptain: (p: RosterPlayer) => boolean;
  editable: boolean;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onReorder: (order: string[]) => void;
  onPickBatter?: (player: RosterPlayer) => void;
}

function statusDot(status: PlayerBattingStatus): string {
  switch (status) {
    case "batting_striker":
    case "batting_non_striker":
      return "bg-emerald-400";
    case "yet_to_bat":
      return "bg-blue-400";
    case "out":
      return "bg-red-500";
    case "retired":
      return "bg-orange-400";
    default:
      return "bg-slate-500";
  }
}

export function BattingLineupPanel({
  battingXi,
  order,
  batters,
  strikerId,
  nonStrikerId,
  outIds,
  teamName,
  isCaptain,
  editable,
  collapsed,
  onToggleCollapse,
  onReorder,
  onPickBatter,
}: BattingLineupPanelProps) {
  const sorted = useMemo(
    () => sortBattersByOrder(battingXi, order),
    [battingXi, order]
  );

  const nextBatter = getNextSuggestedBatter(battingXi, order, {
    outIds,
    strikerId,
    nonStrikerId,
  });

  const move = (index: number, dir: -1 | 1) => {
    const ids = sorted.map((p) => p.id);
    const next = index + dir;
    if (next < 0 || next >= ids.length) return;
    [ids[index], ids[next]] = [ids[next], ids[index]];
    onReorder(ids);
  };

  return (
    <div className="glass-card overflow-hidden">
      <button
        type="button"
        onClick={onToggleCollapse}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <div>
          <h4 className="text-xs uppercase tracking-wider text-slate-500 font-bold">
            Batting Lineup · {teamName}
          </h4>
          {nextBatter && !collapsed && (
            <p className="text-sm text-emerald-400 mt-1">
              Next in: <span className="font-bold">{nextBatter.name}</span>
            </p>
          )}
        </div>
        {onToggleCollapse &&
          (collapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />)}
      </button>

      {!collapsed && (
        <div className="px-4 pb-4 space-y-2">
          {editable && (
            <p className="text-xs text-slate-500 mb-2">
              Drag order or use arrows before the innings starts.
            </p>
          )}
          <ol className="space-y-1.5">
            {sorted.map((player, index) => {
              const status = getBattingStatus(player.id, {
                strikerId,
                nonStrikerId,
                outIds,
                inXi: true,
              });
              const stat = buildBatterCardStats(player, batters, index + 1);
              const isOut = status === "out";
              const isNext = nextBatter?.id === player.id;

              return (
                <li
                  key={player.id}
                  draggable={editable}
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", String(index));
                  }}
                  onDragOver={(e) => editable && e.preventDefault()}
                  onDrop={(e) => {
                    if (!editable) return;
                    e.preventDefault();
                    const from = Number(e.dataTransfer.getData("text/plain"));
                    if (Number.isNaN(from) || from === index) return;
                    const ids = sorted.map((p) => p.id);
                    const [item] = ids.splice(from, 1);
                    ids.splice(index, 0, item);
                    onReorder(ids);
                  }}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-xl border border-white/5 bg-slate-900/30",
                    isOut && "opacity-50 line-through decoration-red-500/50",
                    isNext && !isOut && "ring-1 ring-emerald-400/40"
                  )}
                >
                  {editable && (
                    <GripVertical className="w-4 h-4 text-slate-600 shrink-0 cursor-grab" />
                  )}
                  <span className="text-xs font-black text-slate-500 w-5">{index + 1}</span>
                  <span className={cn("w-2 h-2 rounded-full shrink-0", statusDot(status))} />
                  <PlayerAvatar name={player.name} size="sm" />
                  <button
                    type="button"
                    disabled={isOut || !onPickBatter}
                    onClick={() => onPickBatter?.(player)}
                    className="flex-1 min-w-0 text-left disabled:cursor-default"
                  >
                    <span className="font-semibold text-sm truncate block">
                      {player.name}
                      {isCaptain(player) && (
                        <span className="ml-1 text-[10px] text-amber-400">(C)</span>
                      )}
                    </span>
                    <span className="text-xs text-slate-500 tabular-nums">
                      {stat.runs} ({stat.balls}) · SR {strikeRate(stat.runs, stat.balls)}
                    </span>
                  </button>
                  {editable && (
                    <div className="flex flex-col gap-0.5">
                      <button
                        type="button"
                        onClick={() => move(index, -1)}
                        className="p-1 text-slate-500 hover:text-white min-h-[28px]"
                        aria-label="Move up"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => move(index, 1)}
                        className="p-1 text-slate-500 hover:text-white min-h-[28px]"
                        aria-label="Move down"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}
