"use client";

import { useMemo, useState } from "react";
import type { Match } from "@/types";
import type { InningsOpeners } from "@/lib/engine/live-scoring-service";
import { resolvePlayingXi } from "@/lib/live/player-roster";
import { PlayerAvatar } from "@/components/scorer/player-avatar";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  match: Match;
  target: number;
  onConfirm: (openers: InningsOpeners) => void;
  onCancel: () => void;
  busy?: boolean;
};

export function SecondInningsSetupSheet({
  open,
  match,
  target,
  onConfirm,
  onCancel,
  busy,
}: Props) {
  const battingTeamName =
    match.bowlingTeamId === match.teamAId ? match.teamAName : match.teamBName;
  const bowlingTeamName =
    match.battingTeamId === match.teamAId ? match.teamAName : match.teamBName;

  const battingXi = useMemo(
    () =>
      resolvePlayingXi(
        battingTeamName,
        match.bowlingTeamId === match.teamAId ? match.playingXiA : match.playingXiB
      ),
    [match, battingTeamName]
  );
  const bowlingXi = useMemo(
    () =>
      resolvePlayingXi(
        bowlingTeamName,
        match.battingTeamId === match.teamAId ? match.playingXiA : match.playingXiB
      ),
    [match, bowlingTeamName]
  );

  const [strikerId, setStrikerId] = useState("");
  const [nonStrikerId, setNonStrikerId] = useState("");
  const [bowlerId, setBowlerId] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const submit = () => {
    if (!strikerId || !nonStrikerId) {
      setError("Select opening batters for the chase.");
      return;
    }
    if (strikerId === nonStrikerId) {
      setError("Striker and non-striker must be different.");
      return;
    }
    if (!bowlerId) {
      setError("Select the opening bowler.");
      return;
    }
    setError(null);
    onConfirm({ strikerId, nonStrikerId, bowlerId });
  };

  const pickBtn = (
    players: { id: string; name: string }[],
    selected: string,
    onSelect: (id: string) => void,
    disabled?: string[]
  ) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
      {players.map((p) => (
        <button
          key={p.id}
          type="button"
          disabled={disabled?.includes(p.id)}
          onClick={() => onSelect(p.id)}
          className={cn(
            "flex items-center gap-2 p-3 rounded-xl border-2 text-left min-h-[56px]",
            selected === p.id
              ? "border-emerald-500 bg-emerald-500/10"
              : "border-slate-200/20 hover:border-primary/30",
            disabled?.includes(p.id) && "opacity-40 pointer-events-none"
          )}
        >
          <PlayerAvatar name={p.name} size="sm" />
          <span className="font-semibold truncate">{p.name}</span>
        </button>
      ))}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="glass-card w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div>
          <h2 className="text-xl font-black">Second Innings Setup</h2>
          <p className="text-sm text-slate-500 mt-1">
            Teams swapped automatically. Target: <strong>{target}</strong>
          </p>
          <p className="text-xs text-slate-500 mt-2">
            {battingTeamName} bats · {bowlingTeamName} bowls
          </p>
        </div>

        {error && (
          <p className="text-sm text-red-500 font-medium">{error}</p>
        )}

        <div className="space-y-2">
          <p className="text-sm font-semibold">Opening striker ({battingTeamName})</p>
          {pickBtn(battingXi, strikerId, setStrikerId, nonStrikerId ? [nonStrikerId] : [])}
        </div>
        <div className="space-y-2">
          <p className="text-sm font-semibold">Non-striker</p>
          {pickBtn(battingXi, nonStrikerId, setNonStrikerId, strikerId ? [strikerId] : [])}
        </div>
        <div className="space-y-2">
          <p className="text-sm font-semibold">Opening bowler ({bowlingTeamName})</p>
          {pickBtn(bowlingXi, bowlerId, setBowlerId)}
        </div>

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="flex-1 py-3 rounded-xl glass-card font-semibold min-h-[48px]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-bold min-h-[48px] disabled:opacity-50"
          >
            {busy ? "Starting…" : "Start 2nd Innings"}
          </button>
        </div>
      </div>
    </div>
  );
}
