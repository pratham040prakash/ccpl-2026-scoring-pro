"use client";

import { motion } from "framer-motion";
import { Crown, Shield } from "lucide-react";
import type { BatterScore, BowlerScore } from "@/types";
import { cn, strikeRate } from "@/lib/utils";
import {
  type PlayerBattingStatus,
  statusColor,
  statusLabel,
  suggestionBadge,
  type BowlerSuggestionReason,
} from "@/lib/live/participant-selection";
import { PlayerAvatar } from "@/components/scorer/player-avatar";

interface BatterCardProps {
  stat: BatterScore & { jerseyNumber?: number };
  status: PlayerBattingStatus;
  selected?: boolean;
  disabled?: boolean;
  recommended?: boolean;
  isCaptain?: boolean;
  focused?: boolean;
  onSelect: () => void;
}

export function BatterCard({
  stat,
  status,
  selected,
  disabled,
  recommended,
  isCaptain,
  focused,
  onSelect,
}: BatterCardProps) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: disabled ? 1 : 0.97 }}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "participant-card text-left w-full min-h-[72px] p-3 rounded-2xl border-2 transition-all",
        statusColor(status),
        selected && "ring-2 ring-emerald-400 border-emerald-400",
        focused && "ring-2 ring-white/50",
        disabled && "pointer-events-none",
        !disabled && "hover:border-emerald-400/50 active:scale-[0.98]"
      )}
    >
      <div className="flex gap-3 items-start">
        <PlayerAvatar
          name={stat.playerName}
          size="md"
          ringClass={selected ? "ring-2 ring-emerald-400" : undefined}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {stat.jerseyNumber != null && (
              <span className="text-xs font-black text-slate-400">#{stat.jerseyNumber}</span>
            )}
            <span className="font-bold truncate">{stat.playerName}</span>
            {isCaptain && (
              <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
                <Crown className="w-3 h-3" /> C
              </span>
            )}
            {recommended && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 font-semibold">
                Next
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">{statusLabel(status)}</p>
          <div className="grid grid-cols-5 gap-1 mt-2 text-center text-xs tabular-nums">
            <div><span className="block font-black text-base">{stat.runs}</span><span className="text-slate-500">R</span></div>
            <div><span className="block font-bold">{stat.balls}</span><span className="text-slate-500">B</span></div>
            <div><span className="block font-bold">{stat.fours}</span><span className="text-slate-500">4s</span></div>
            <div><span className="block font-bold">{stat.sixes}</span><span className="text-slate-500">6s</span></div>
            <div><span className="block font-bold">{strikeRate(stat.runs, stat.balls)}</span><span className="text-slate-500">SR</span></div>
          </div>
        </div>
      </div>
    </motion.button>
  );
}

interface BowlerCardProps {
  stat: BowlerScore;
  oversLeft: number;
  dots: number;
  selected?: boolean;
  disabled?: boolean;
  recommended?: boolean;
  suggestionReason?: BowlerSuggestionReason;
  isCaptain?: boolean;
  focused?: boolean;
  onSelect: () => void;
}

export function BowlerCard({
  stat,
  oversLeft,
  dots,
  selected,
  disabled,
  recommended,
  suggestionReason,
  isCaptain,
  focused,
  onSelect,
}: BowlerCardProps) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: disabled ? 1 : 0.97 }}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "participant-card text-left w-full min-h-[72px] p-3 rounded-2xl border-2 transition-all",
        "border-purple-400/30 bg-purple-500/5",
        selected && "ring-2 ring-purple-400 border-purple-400",
        focused && "ring-2 ring-white/50",
        disabled && "opacity-40 pointer-events-none",
        !disabled && "hover:border-purple-400/50"
      )}
    >
      <div className="flex gap-3 items-start">
        <PlayerAvatar name={stat.playerName} size="md" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold truncate">{stat.playerName}</span>
            {isCaptain && (
              <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
                <Shield className="w-3 h-3" /> C
              </span>
            )}
            {recommended && suggestionReason && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/40 text-purple-100 font-semibold">
                {suggestionBadge(suggestionReason)}
              </span>
            )}
          </div>
          <div className="grid grid-cols-5 gap-1 mt-2 text-center text-xs tabular-nums">
            <div>
              <span className="block font-black text-base">
                {Math.floor(stat.balls / 6)}.{stat.balls % 6}
              </span>
              <span className="text-slate-500">Ov</span>
            </div>
            <div><span className="block font-bold">{stat.runs}</span><span className="text-slate-500">R</span></div>
            <div><span className="block font-bold">{stat.wickets}</span><span className="text-slate-500">W</span></div>
            <div><span className="block font-bold">{stat.economy.toFixed(1)}</span><span className="text-slate-500">Econ</span></div>
            <div><span className="block font-bold">{dots}</span><span className="text-slate-500">Dots</span></div>
          </div>
          <p className="text-xs text-slate-400 mt-1">{oversLeft} overs left</p>
        </div>
      </div>
    </motion.button>
  );
}

interface CreaseSlotProps {
  label: string;
  name?: string;
  stats?: string;
  accent: "emerald" | "blue" | "purple";
  onTap: () => void;
  emptyLabel: string;
}

const ACCENT = {
  emerald: "border-emerald-400/50 bg-emerald-500/10 ring-emerald-400/30",
  blue: "border-blue-400/50 bg-blue-500/10 ring-blue-400/30",
  purple: "border-purple-400/50 bg-purple-500/10 ring-purple-400/30",
};

export function CreaseSlot({ label, name, stats, accent, onTap, emptyLabel }: CreaseSlotProps) {
  return (
    <button
      type="button"
      onClick={onTap}
      className={cn(
        "crease-slot min-h-[64px] w-full p-3 rounded-2xl border-2 text-left transition-all",
        "hover:brightness-110 active:scale-[0.99]",
        name ? ACCENT[accent] : "border-dashed border-slate-600 bg-slate-800/30"
      )}
    >
      <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">{label}</p>
      {name ? (
        <>
          <p className="font-black text-lg truncate">{name}</p>
          {stats && <p className="text-xs text-slate-400 tabular-nums">{stats}</p>}
        </>
      ) : (
        <p className="text-sm text-slate-500 mt-1">{emptyLabel}</p>
      )}
    </button>
  );
}
