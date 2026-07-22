"use client";

import { useCallback, useState } from "react";
import { motion } from "framer-motion";
import { Undo2, Redo2, RotateCcw } from "lucide-react";
import type { ScoringAction, DismissalType } from "@/types";
import { cn } from "@/lib/utils";

interface MobileScorerProps {
  onScore: (action: ScoringAction) => void;
  onUndo: () => void;
  disabled?: boolean;
  currentOver?: string;
}

const RUN_BUTTONS = [0, 1, 2, 3, 4, 5, 6];

export function MobileScorer({ onScore, onUndo, disabled, currentOver }: MobileScorerProps) {
  const [wicketMode, setWicketMode] = useState(false);

  const handleRun = useCallback(
    (runs: number) => {
      if (runs === 0) {
        onScore({ type: "dot" });
      } else {
        onScore({ type: "runs", runs });
      }
    },
    [onScore]
  );

  const handleWicket = (dismissal: DismissalType) => {
    onScore({ type: "wicket", dismissal });
    setWicketMode(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-950 text-white flex flex-col z-50">
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-400">Mobile Scorer Mode</p>
          {currentOver && <p className="font-bold">Over {currentOver}</p>}
        </div>
        <button
          onClick={onUndo}
          disabled={disabled}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 disabled:opacity-50"
        >
          <Undo2 className="w-5 h-5" /> Undo
        </button>
      </div>

      <div className="flex-1 p-3 overflow-y-auto">
        {!wicketMode ? (
          <>
            <div className="mobile-scorer-grid grid grid-cols-3 gap-2 mb-4">
              {RUN_BUTTONS.map((runs) => (
                <motion.button
                  key={runs}
                  whileTap={{ scale: 0.92 }}
                  disabled={disabled}
                  onClick={() => handleRun(runs)}
                  className={cn(
                    "h-20 sm:h-24 rounded-2xl text-2xl sm:text-3xl font-black disabled:opacity-50",
                    runs === 0
                      ? "bg-slate-700"
                      : runs === 4
                        ? "bg-blue-600"
                        : runs === 6
                          ? "bg-purple-600"
                          : "bg-emerald-600"
                  )}
                >
                  {runs === 0 ? "·" : runs}
                </motion.button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4">
              <motion.button
                whileTap={{ scale: 0.95 }}
                disabled={disabled}
                onClick={() => onScore({ type: "wide" })}
                className="score-btn-extra h-16 rounded-2xl text-lg font-bold"
              >
                Wide
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                disabled={disabled}
                onClick={() => onScore({ type: "no_ball" })}
                className="score-btn-extra h-16 rounded-2xl text-lg font-bold"
              >
                No Ball
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                disabled={disabled}
                onClick={() => onScore({ type: "bye", runs: 1 })}
                className="h-16 rounded-2xl bg-slate-700 font-bold"
              >
                Bye
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                disabled={disabled}
                onClick={() => onScore({ type: "leg_bye", runs: 1 })}
                className="h-16 rounded-2xl bg-slate-700 font-bold"
              >
                Leg Bye
              </motion.button>
            </div>

            <motion.button
              whileTap={{ scale: 0.95 }}
              disabled={disabled}
              onClick={() => setWicketMode(true)}
              className="w-full score-btn-wicket h-20 rounded-2xl text-xl font-black mb-4"
            >
              WICKET
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.95 }}
              disabled={disabled}
              onClick={() => onScore({ type: "penalty", runs: 5 })}
              className="w-full h-14 rounded-2xl bg-orange-700 font-bold"
            >
              Penalty (+5)
            </motion.button>
          </>
        ) : (
          <div className="space-y-2">
            <button
              onClick={() => setWicketMode(false)}
              className="mb-4 flex items-center gap-2 text-slate-400"
            >
              <RotateCcw className="w-4 h-4" /> Back
            </button>
            {(["bowled", "caught", "lbw", "run_out", "stumped", "hit_wicket", "retired_hurt"] as DismissalType[]).map(
              (d) => (
                <motion.button
                  key={d}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleWicket(d)}
                  className="w-full h-16 rounded-2xl bg-red-700 font-bold capitalize"
                >
                  {d.replace("_", " ")}
                </motion.button>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function DesktopScorer(props: MobileScorerProps) {
  return (
    <div className="glass-card p-4">
      <h3 className="font-bold mb-4">Scoring Panel</h3>
      <MobileScorer {...props} />
    </div>
  );
}
