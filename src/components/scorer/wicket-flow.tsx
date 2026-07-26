"use client";

import { useEffect, useMemo, useState } from "react";
import type { DismissalType, BatterScore } from "@/types";
import type { RosterPlayer } from "@/lib/live/player-roster";
import {
  buildBatterCardStats,
  filterPlayersBySearch,
  getAvailableBatters,
  getBattingStatus,
} from "@/lib/live/participant-selection";
import { SelectionSheet } from "@/components/scorer/selection-sheet";
import { BatterCard } from "@/components/scorer/player-cards";
import { tryAutoSelectSingleBatter } from "@/components/scorer/participant-picker-sheet";

interface WicketFlowProps {
  open: boolean;
  dismissal: DismissalType | null;
  battingXi: RosterPlayer[];
  bowlingXi: RosterPlayer[];
  batters: BatterScore[];
  order: string[];
  strikerId: string;
  nonStrikerId: string;
  outBatterIds: Set<string>;
  teamName: string;
  isBattingCaptain: (p: RosterPlayer) => boolean;
  isBowlingCaptain: (p: RosterPlayer) => boolean;
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
  batters,
  order,
  strikerId,
  nonStrikerId,
  outBatterIds,
  teamName,
  isBattingCaptain,
  isBowlingCaptain,
  onConfirm,
  onCancel,
}: WicketFlowProps) {
  const [step, setStep] = useState<"out" | "fielder" | "batter">("out");
  const [dismissedId, setDismissedId] = useState(strikerId);
  const [fielderId, setFielderId] = useState("");
  const [search, setSearch] = useState("");

  const needsFielder =
    dismissal === "caught" ||
    dismissal === "run_out" ||
    dismissal === "stumped";

  const jerseyMap = useMemo(() => {
    const m = new Map<string, number>();
    order.forEach((id, i) => m.set(id, i + 1));
    return m;
  }, [order]);

  const availableBatters = useMemo(
    () =>
      getAvailableBatters(battingXi, order, {
        outIds: outBatterIds,
        excludeIds: [dismissedId, strikerId, nonStrikerId],
      }),
    [battingXi, order, outBatterIds, dismissedId, strikerId, nonStrikerId]
  );

  const filteredBatters = useMemo(
    () => filterPlayersBySearch(availableBatters, search, jerseyMap),
    [availableBatters, search, jerseyMap]
  );

  useEffect(() => {
    if (open) {
      setDismissedId(strikerId);
      setFielderId("");
      setSearch("");
      setStep("out");
    }
  }, [open, strikerId]);

  if (!open || !dismissal) return null;

  const confirmOut = (id: string) => {
    setDismissedId(id);
    if (needsFielder) {
      setStep("fielder");
      return;
    }
    goToBatterStep(id, "");
  };

  const confirmFielder = (id: string) => {
    setFielderId(id);
    goToBatterStep(dismissedId, id);
  };

  const goToBatterStep = (outId: string, fielder: string) => {
    const remaining = getAvailableBatters(battingXi, order, {
      outIds: outBatterIds,
      excludeIds: [outId, strikerId, nonStrikerId],
    });
    if (tryAutoSelectSingleBatter(remaining, (player) => {
      onConfirm({
        dismissal: dismissal!,
        dismissedPlayerId: outId,
        fielderId: fielder || undefined,
        newBatterId: player.id,
      });
    })) {
      return;
    }
    setStep("batter");
  };

  const confirmBatter = (id: string) => {
    onConfirm({
      dismissal,
      dismissedPlayerId: dismissedId,
      fielderId: fielderId || undefined,
      newBatterId: id,
    });
  };

  if (step === "out") {
    return (
      <SelectionSheet
        open
        title={`Wicket — ${dismissal.replace(/_/g, " ")}`}
        subtitle="Who got out?"
        search=""
        onSearchChange={() => {}}
        onClose={onCancel}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[strikerId, nonStrikerId].map((id) => {
            const player = battingXi.find((p) => p.id === id);
            if (!player) return null;
            const stat = buildBatterCardStats(player, batters, jerseyMap.get(id) ?? 0);
            const status =
              id === strikerId ? ("batting_striker" as const) : ("batting_non_striker" as const);
            return (
              <BatterCard
                key={id}
                stat={stat}
                status={status}
                selected={dismissedId === id}
                isCaptain={isBattingCaptain(player)}
                onSelect={() => confirmOut(id)}
              />
            );
          })}
        </div>
      </SelectionSheet>
    );
  }

  if (step === "fielder") {
    const fielders = filterPlayersBySearch(bowlingXi, search, jerseyMap);
    return (
      <SelectionSheet
        open
        title="Select Fielder"
        subtitle={teamName}
        search={search}
        onSearchChange={setSearch}
        onClose={onCancel}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {fielders.map((player) => {
            const stat = buildBatterCardStats(player, batters, 0);
            return (
              <BatterCard
                key={player.id}
                stat={{ ...stat, playerName: player.name }}
                status="yet_to_bat"
                selected={fielderId === player.id}
                isCaptain={isBowlingCaptain(player)}
                onSelect={() => confirmFielder(player.id)}
              />
            );
          })}
        </div>
      </SelectionSheet>
    );
  }

  return (
    <SelectionSheet
      open
      title="Select New Batter"
      subtitle="Remaining batters · batting order"
      search={search}
      onSearchChange={setSearch}
      onClose={onCancel}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredBatters.map((player, index) => {
          const status = getBattingStatus(player.id, {
            strikerId,
            nonStrikerId,
            outIds: outBatterIds,
            inXi: true,
          });
          const stat = buildBatterCardStats(
            player,
            batters,
            jerseyMap.get(player.id) ?? index + 1
          );
          return (
            <BatterCard
              key={player.id}
              stat={stat}
              status={status}
              recommended={index === 0}
              isCaptain={isBattingCaptain(player)}
              onSelect={() => confirmBatter(player.id)}
            />
          );
        })}
      </div>
      {filteredBatters.length === 0 && (
        <p className="text-center text-slate-500 py-6">No batters left.</p>
      )}
    </SelectionSheet>
  );
}
