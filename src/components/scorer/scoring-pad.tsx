"use client";

import { motion } from "framer-motion";
import { RotateCcw } from "lucide-react";
import type { DismissalType, ScoringAction } from "@/types";
import { cn } from "@/lib/utils";

const RUN_BUTTONS = [0, 1, 2, 3, 4, 5, 6] as const;

interface ScoringPadProps {
  disabled?: boolean;
  paused?: boolean;
  extrasMode: "wide" | "no_ball" | "bye" | "leg_bye" | null;
  wicketMode: boolean;
  dismissals: DismissalType[];
  onScore: (action: ScoringAction) => void;
  onExtrasMode: (mode: "wide" | "no_ball" | "bye" | "leg_bye" | null) => void;
  onWicketMode: (open: boolean) => void;
  onPendingDismissal: (d: DismissalType) => void;
  lastBallLabel?: string;
}

export function ScoringPad({
  disabled,
  paused,
  extrasMode,
  wicketMode,
  dismissals,
  onScore,
  onExtrasMode,
  onWicketMode,
  onPendingDismissal,
  lastBallLabel,
}: ScoringPadProps) {
  const blocked = disabled || paused;

  if (extrasMode) {
    return (
      <div className="scoring-pad glass-card p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="font-bold capitalize">{extrasMode.replace("_", " ")} — runs on delivery</p>
          <button
            type="button"
            onClick={() => onExtrasMode(null)}
            className="text-sm text-slate-400 flex items-center gap-1 min-h-[44px] px-2"
          >
            <RotateCcw className="w-4 h-4" /> Back
          </button>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
          {[0, 1, 2, 3, 4, 5, 6].map((r) => (
            <button
              key={r}
              type="button"
              disabled={blocked}
              onClick={() => {
                if (extrasMode === "wide") onScore({ type: "wide", runs: r });
                else if (extrasMode === "no_ball") onScore({ type: "no_ball", runs: r });
                else if (extrasMode === "bye") onScore({ type: "bye", runs: r || 1 });
                else onScore({ type: "leg_bye", runs: r || 1 });
              }}
              className="score-pad-btn h-14 sm:h-16 rounded-xl bg-amber-600 text-white font-bold disabled:opacity-40"
            >
              {r}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (wicketMode) {
    return (
      <div className="scoring-pad glass-card p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="font-bold text-red-300">Wicket — how out?</p>
          <button
            type="button"
            onClick={() => onWicketMode(false)}
            className="text-sm text-slate-400 flex items-center gap-1 min-h-[44px] px-2"
          >
            <RotateCcw className="w-4 h-4" /> Back
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {dismissals.map((d) => (
            <button
              key={d}
              type="button"
              disabled={blocked}
              onClick={() => onPendingDismissal(d)}
              className="score-pad-btn min-h-[56px] rounded-xl bg-red-700 text-white font-bold capitalize disabled:opacity-40"
            >
              {d.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="scoring-pad glass-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-black uppercase tracking-wider text-slate-400">Score this ball</h3>
        {lastBallLabel && (
          <span className="text-xs text-slate-500 tabular-nums">Last: {lastBallLabel}</span>
        )}
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
        {RUN_BUTTONS.map((runs) => (
          <motion.button
            key={runs}
            whileTap={{ scale: blocked ? 1 : 0.92 }}
            disabled={blocked}
            onClick={() => onScore(runs === 0 ? { type: "dot" } : { type: "runs", runs })}
            className={cn(
              "score-pad-btn h-16 sm:h-[4.5rem] rounded-2xl text-2xl font-black disabled:opacity-40",
              runs === 0
                ? "bg-slate-700 text-white"
                : runs === 4
                  ? "bg-blue-600 text-white"
                  : runs === 6
                    ? "bg-purple-600 text-white"
                    : "bg-emerald-600 text-white"
            )}
          >
            {runs === 0 ? "·" : runs}
          </motion.button>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {(["wide", "no_ball", "bye", "leg_bye"] as const).map((ex) => (
          <button
            key={ex}
            type="button"
            disabled={blocked}
            onClick={() => onExtrasMode(ex)}
            className="score-pad-btn min-h-[56px] rounded-xl bg-amber-600/90 text-white font-bold capitalize disabled:opacity-40"
          >
            {ex.replace("_", " ")}
          </button>
        ))}
        <button
          type="button"
          disabled={blocked}
          onClick={() => onScore({ type: "penalty", runs: 5 })}
          className="score-pad-btn min-h-[56px] rounded-xl bg-orange-700 text-white font-bold disabled:opacity-40"
        >
          Penalty
        </button>
        <button
          type="button"
          disabled={blocked}
          onClick={() => onWicketMode(true)}
          className="score-pad-btn min-h-[56px] rounded-xl bg-red-600 text-white font-black disabled:opacity-40"
        >
          Wicket
        </button>
      </div>
    </div>
  );
}
