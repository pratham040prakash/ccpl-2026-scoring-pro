"use client";

import { ArrowLeftRight, RotateCcw, UserPlus, Undo2 } from "lucide-react";

interface QuickActionsBarProps {
  disabled?: boolean;
  onUndo: () => void;
  onSwapStrike: () => void;
  onNextBatter: () => void;
  onRecentBowler: () => void;
  nextBatterName?: string;
  recentBowlerName?: string;
}

export function QuickActionsBar({
  disabled,
  onUndo,
  onSwapStrike,
  onNextBatter,
  onRecentBowler,
  nextBatterName,
  recentBowlerName,
}: QuickActionsBarProps) {
  const actions = [
    {
      label: "Undo",
      icon: Undo2,
      onClick: onUndo,
      title: "Undo last ball",
    },
    {
      label: "Swap",
      icon: ArrowLeftRight,
      onClick: onSwapStrike,
      title: "Swap striker & non-striker",
    },
    {
      label: nextBatterName ? `Next: ${nextBatterName.split(" ")[0]}` : "Next batter",
      icon: UserPlus,
      onClick: onNextBatter,
      title: nextBatterName ? `Set ${nextBatterName} as striker` : "Pick next batter",
    },
    {
      label: recentBowlerName ? `Last: ${recentBowlerName.split(" ")[0]}` : "Last bowler",
      icon: RotateCcw,
      onClick: onRecentBowler,
      title: recentBowlerName ? `Set ${recentBowlerName} as bowler` : "Previous over bowler",
    },
  ];

  return (
    <div className="glass-card p-2">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {actions.map(({ label, icon: Icon, onClick, title }) => (
          <button
            key={title}
            type="button"
            title={title}
            disabled={disabled}
            onClick={onClick}
            className="quick-action-btn flex flex-col items-center justify-center gap-1 min-h-[60px] rounded-xl bg-slate-800/80 hover:bg-slate-700 text-white text-xs font-bold disabled:opacity-40 px-2"
          >
            <Icon className="w-5 h-5 shrink-0" />
            <span className="truncate max-w-full">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export type ParticipantPickMode =
  | "striker"
  | "non_striker"
  | "bowler"
  | "new_batter"
  | "opener_striker"
  | "opener_non_striker"
  | "opener_bowler";

export function pickModeTitle(mode: ParticipantPickMode): string {
  switch (mode) {
    case "striker":
      return "Select Striker";
    case "non_striker":
      return "Select Non-Striker";
    case "new_batter":
      return "Select New Batter";
    case "bowler":
      return "Select Bowler";
    case "opener_striker":
      return "Choose Opener (Striker)";
    case "opener_non_striker":
      return "Choose Opener (Non-Striker)";
    case "opener_bowler":
      return "Choose Opening Bowler";
  }
}

export function pickModeSubtitle(mode: ParticipantPickMode, suggestedName?: string): string {
  if (suggestedName) return `Suggested: ${suggestedName} · tap to select`;
  if (mode === "new_batter") return "Remaining batters in batting order";
  if (mode === "bowler") return "Eligible bowlers for the next over";
  return "Tap once to assign";
}
