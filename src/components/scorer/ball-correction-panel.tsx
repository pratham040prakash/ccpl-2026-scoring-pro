"use client";

import { useState } from "react";
import type { Ball, ScoringAction } from "@/types";
import { formatBallForPicker } from "@/components/scorer/ball-audit-history";

const QUICK_ACTIONS: { label: string; action: ScoringAction }[] = [
  { label: "·", action: { type: "dot" } },
  { label: "1", action: { type: "runs", runs: 1 } },
  { label: "2", action: { type: "runs", runs: 2 } },
  { label: "3", action: { type: "runs", runs: 3 } },
  { label: "4", action: { type: "runs", runs: 4 } },
  { label: "6", action: { type: "runs", runs: 6 } },
  { label: "Wide", action: { type: "wide", runs: 0 } },
  { label: "No Ball", action: { type: "no_ball", runs: 0 } },
];

interface BallCorrectionPanelProps {
  balls: Ball[];
  disabled?: boolean;
  onCorrect: (ballId: string, action: ScoringAction, reason: string) => Promise<void>;
}

export function BallCorrectionPanel({ balls, disabled, onCorrect }: BallCorrectionPanelProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recent = balls.slice(-6).reverse();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = recent.find((b) => b.id === selectedId) ?? recent[0];

  const submit = async (action: ScoringAction) => {
    if (!selected || disabled || busy) return;
    if (reason.trim().length < 3) {
      setError("Enter a correction reason (at least 3 characters).");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onCorrect(selected.id, action, reason);
      setReason("");
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  if (balls.length === 0) return null;

  return (
    <div className="glass-card p-4">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="text-sm font-semibold text-purple-200"
      >
        {open ? "Hide ball correction" : "Correct a delivery (audit trail)"}
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          <p className="text-xs text-slate-400">
            Select a recent delivery, choose the corrected outcome, and enter a reason. All changes
            are logged with before/after values.
          </p>

          <div className="flex flex-wrap gap-2">
            {recent.map((ball) => (
              <button
                key={ball.id}
                type="button"
                onClick={() => setSelectedId(ball.id)}
                className={`text-xs px-2 py-1 rounded ${
                  selected?.id === ball.id
                    ? "bg-purple-600 text-white"
                    : "bg-slate-800 text-slate-200"
                }`}
              >
                {formatBallForPicker(ball)}
              </button>
            ))}
          </div>

          {selected && (
            <p className="text-sm">
              Correcting: <span className="font-mono">{formatBallForPicker(selected)}</span>
            </p>
          )}

          <label className="block text-xs text-slate-400">
            Reason (required)
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-white"
              placeholder="e.g. Scorer entered 4 instead of 1"
            />
          </label>

          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {QUICK_ACTIONS.map(({ label, action }) => (
              <button
                key={label}
                type="button"
                disabled={disabled || busy || !selected}
                onClick={() => submit(action)}
                className="h-10 rounded-lg bg-slate-800 text-white text-sm font-bold disabled:opacity-40"
              >
                {label}
              </button>
            ))}
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>
      )}
    </div>
  );
}
