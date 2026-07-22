"use client";

import { useEffect, useState } from "react";
import type { DismissalType } from "@/types";
import type { RosterPlayer } from "@/lib/live/player-roster";

interface WicketFlowProps {
  open: boolean;
  dismissal: DismissalType | null;
  battingXi: RosterPlayer[];
  bowlingXi: RosterPlayer[];
  strikerId: string;
  nonStrikerId: string;
  outBatterIds: Set<string>;
  onConfirm: (payload: {
    dismissal: DismissalType;
    dismissedPlayerId: string;
    fielderId?: string;
    newBatterId: string;
  }) => void;
  onCancel: () => void;
}

export function WicketFlow({
  open,
  dismissal,
  battingXi,
  bowlingXi,
  strikerId,
  nonStrikerId,
  outBatterIds,
  onConfirm,
  onCancel,
}: WicketFlowProps) {
  const [dismissedId, setDismissedId] = useState(strikerId);
  const [fielderId, setFielderId] = useState("");
  const [newBatterId, setNewBatterId] = useState("");

  useEffect(() => {
    if (open) {
      setDismissedId(strikerId);
      setFielderId("");
      setNewBatterId("");
    }
  }, [open, strikerId]);

  if (!open || !dismissal) return null;

  const availableBatters = battingXi.filter(
    (p) => !outBatterIds.has(p.id) && p.id !== dismissedId
  );

  const needsFielder =
    dismissal === "caught" ||
    dismissal === "run_out" ||
    dismissal === "stumped";

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-4">
      <div className="glass-card w-full max-w-md p-5 space-y-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-black capitalize">
          Wicket — {dismissal.replace(/_/g, " ")}
        </h3>

        <label className="block text-sm">
          Out batter
          <select
            value={dismissedId}
            onChange={(e) => setDismissedId(e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-900 text-white"
          >
            <option value={strikerId}>Striker</option>
            <option value={nonStrikerId}>Non-striker</option>
          </select>
        </label>

        {needsFielder && (
          <label className="block text-sm">
            Fielder
            <select
              value={fielderId}
              onChange={(e) => setFielderId(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-900 text-white"
            >
              <option value="">Select fielder</option>
              {bowlingXi.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="block text-sm">
          New batter
          <select
            value={newBatterId}
            onChange={(e) => setNewBatterId(e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-900 text-white"
          >
            <option value="">Select batter</option>
            {availableBatters.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl bg-slate-700 text-white font-bold"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!newBatterId}
            onClick={() =>
              onConfirm({
                dismissal,
                dismissedPlayerId: dismissedId,
                fielderId: fielderId || undefined,
                newBatterId,
              })
            }
            className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold disabled:opacity-40"
          >
            Confirm Wicket
          </button>
        </div>
      </div>
    </div>
  );
}
