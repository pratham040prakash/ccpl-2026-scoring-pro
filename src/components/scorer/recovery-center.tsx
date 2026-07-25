"use client";

import { useMemo, useState } from "react";
import type { Ball } from "@/types";
import { formatBallForPicker } from "@/components/scorer/ball-audit-history";
import { formatOverLabel } from "@/lib/engine/innings-metrics";
import { CONFIRM } from "@/lib/live/operator-confirm";

interface RecoveryCenterProps {
  balls: Ball[];
  disabled?: boolean;
  onRestore: (over: number, ball: number, reason: string) => Promise<void>;
}

const PRESETS = [
  { label: "Start of over 3", over: 2, ball: 6 },
  { label: "Start of over 6", over: 5, ball: 6 },
  { label: "Start of over 9", over: 8, ball: 6 },
];

export function RecoveryCenter({ balls, disabled, onRestore }: RecoveryCenterProps) {
  const [open, setOpen] = useState(false);
  const [over, setOver] = useState("0");
  const [ball, setBall] = useState("0");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const removing = useMemo(() => {
    const targetOver = Number.parseInt(over, 10) || 0;
    const targetBall = Number.parseInt(ball, 10) || 0;
    return balls.filter((b) => {
      if (b.overNumber < targetOver) return false;
      if (b.overNumber > targetOver) return true;
      return b.ballNumber > targetBall;
    }).length;
  }, [balls, over, ball]);

  const submit = async (targetOver: number, targetBall: number) => {
    if (disabled || busy) return;
    if (reason.trim().length < 3) {
      setError("Enter a recovery reason (at least 3 characters).");
      return;
    }
    const ok = await CONFIRM.restoreOver(targetOver, targetBall, removing);
    if (!ok) return;

    setBusy(true);
    setError(null);
    try {
      await onRestore(targetOver, targetBall, reason.trim());
      setOpen(false);
      setReason("");
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
        {open ? "Hide recovery center" : "Recovery center (restore to over)"}
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          <p className="text-xs text-slate-400">
            Restore deletes all deliveries after the selected point. Every restore is audit-logged with
            timestamp, operator, and reason.
          </p>

          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                disabled={disabled || busy}
                onClick={() => {
                  setOver(String(preset.over));
                  setBall(String(preset.ball));
                }}
                className="text-xs px-2 py-1 rounded bg-slate-800 text-slate-200 disabled:opacity-40"
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-3 items-end">
            <label className="text-xs text-slate-400">
              Over
              <input
                value={over}
                onChange={(e) => setOver(e.target.value)}
                className="block mt-1 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 w-20 text-white"
              />
            </label>
            <label className="text-xs text-slate-400">
              Ball
              <input
                value={ball}
                onChange={(e) => setBall(e.target.value)}
                className="block mt-1 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 w-20 text-white"
              />
            </label>
            <button
              type="button"
              disabled={disabled || busy}
              onClick={() => submit(Number.parseInt(over, 10) || 0, Number.parseInt(ball, 10) || 0)}
              className="px-4 py-2 rounded-lg bg-purple-700 text-white text-sm font-semibold disabled:opacity-40"
            >
              Restore to {formatOverLabel(Number.parseInt(over, 10) || 0, Number.parseInt(ball, 10) || 0)}
            </button>
          </div>

          {balls.length > 0 && (
            <p className="text-xs text-slate-500">
              Latest: {formatBallForPicker(balls[balls.length - 1])} · removing {removing} ball
              {removing === 1 ? "" : "s"}
            </p>
          )}

          <label className="block text-xs text-slate-400">
            Reason (required)
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-white"
              placeholder="e.g. Wrong over scored — reset to over 5.6"
            />
          </label>

          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>
      )}
    </div>
  );
}
