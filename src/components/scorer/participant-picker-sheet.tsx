"use client";

import { useMemo, useState } from "react";
import type { Ball, BatterScore, BowlerScore } from "@/types";
import type { RosterPlayer } from "@/lib/live/player-roster";
import {
  buildBatterCardStats,
  filterPlayersBySearch,
  getAvailableBatters,
  getBattingStatus,
  getBowlerDisplayStats,
  getEligibleBowlers,
  sortBattersByOrder,
  suggestBowler,
  validateBatterPick,
  validateBowlerPick,
} from "@/lib/live/participant-selection";
import { SelectionSheet, useCardListKeyboard } from "@/components/scorer/selection-sheet";
import { BatterCard, BowlerCard } from "@/components/scorer/player-cards";
import { pickModeSubtitle, pickModeTitle, type ParticipantPickMode } from "@/components/scorer/quick-actions-bar";

interface ParticipantPickerSheetProps {
  open: boolean;
  mode: ParticipantPickMode;
  battingXi: RosterPlayer[];
  bowlingXi: RosterPlayer[];
  batters: BatterScore[];
  bowlers: BowlerScore[];
  balls: Ball[];
  order: string[];
  matchOvers: number;
  strikerId?: string;
  nonStrikerId?: string;
  bowlerId?: string;
  outIds: Set<string>;
  excludeBatterIds?: string[];
  teamName: string;
  bowlingTeamName: string;
  isBattingCaptain: (p: RosterPlayer) => boolean;
  isBowlingCaptain: (p: RosterPlayer) => boolean;
  onClose: () => void;
  onPickBatter: (player: RosterPlayer, mode: ParticipantPickMode) => void;
  onPickBowler: (player: RosterPlayer) => void;
  validationError?: string | null;
  onValidationError?: (msg: string | null) => void;
}

export function ParticipantPickerSheet({
  open,
  mode,
  battingXi,
  bowlingXi,
  batters,
  bowlers,
  balls,
  order,
  matchOvers,
  strikerId,
  nonStrikerId,
  bowlerId,
  outIds,
  excludeBatterIds,
  teamName,
  bowlingTeamName,
  isBattingCaptain,
  isBowlingCaptain,
  onClose,
  onPickBatter,
  onPickBowler,
  onValidationError,
}: ParticipantPickerSheetProps) {
  const [search, setSearch] = useState("");

  const isBowlerMode = mode === "bowler" || mode === "opener_bowler";

  const jerseyMap = useMemo(() => {
    const m = new Map<string, number>();
    order.forEach((id, i) => m.set(id, i + 1));
    return m;
  }, [order]);

  const batterRole = useMemo(() => {
    if (mode === "non_striker" || mode === "opener_non_striker") return "non_striker" as const;
    if (mode === "new_batter") return "new_batter" as const;
    return "striker" as const;
  }, [mode]);

  const availableBatters = useMemo(() => {
    if (isBowlerMode) return [];
    return getAvailableBatters(battingXi, order, {
      outIds,
      excludeIds: mode === "new_batter" ? excludeBatterIds : undefined,
    });
  }, [isBowlerMode, battingXi, order, outIds, excludeBatterIds, mode]);

  const filteredBatters = useMemo(
    () => filterPlayersBySearch(availableBatters, search, jerseyMap),
    [availableBatters, search, jerseyMap]
  );

  const eligibleBowlers = useMemo(
    () => getEligibleBowlers(bowlingXi, bowlers, bowlerId, matchOvers),
    [bowlingXi, bowlers, bowlerId, matchOvers]
  );

  const filteredBowlers = useMemo(
    () => filterPlayersBySearch(eligibleBowlers, search, jerseyMap),
    [eligibleBowlers, search, jerseyMap]
  );

  const suggestion = useMemo(
    () => suggestBowler(bowlingXi, bowlers, balls, bowlerId, matchOvers),
    [bowlingXi, bowlers, balls, bowlerId, matchOvers]
  );

  const suggestedBatter = filteredBatters[0];
  const suggestedBowler = suggestion
    ? filteredBowlers.find((p) => p.id === suggestion.playerId)
    : filteredBowlers[0];

  const handleBatterSelect = (player: RosterPlayer) => {
    const err = validateBatterPick(player.id, batterRole, {
      outIds,
      strikerId,
      nonStrikerId,
    });
    if (err) {
      onValidationError?.(err);
      return;
    }
    onValidationError?.(null);
    onPickBatter(player, mode);
    onClose();
    setSearch("");
  };

  const handleBowlerSelect = (player: RosterPlayer) => {
    const err = validateBowlerPick(player.id, bowlerId, bowlers, matchOvers);
    if (err) {
      onValidationError?.(err);
      return;
    }
    onValidationError?.(null);
    onPickBowler(player);
    onClose();
    setSearch("");
  };

  const listCount = isBowlerMode ? filteredBowlers.length : filteredBatters.length;
  const { focusIndex } = useCardListKeyboard(
    listCount,
    (index) => {
      if (isBowlerMode) {
        const p = filteredBowlers[index];
        if (p) handleBowlerSelect(p);
      } else {
        const p = filteredBatters[index];
        if (p) handleBatterSelect(p);
      }
    },
    open
  );

  const subtitle = pickModeSubtitle(
    mode,
    isBowlerMode ? suggestedBowler?.name : suggestedBatter?.name
  );

  return (
    <SelectionSheet
      open={open}
      title={pickModeTitle(mode)}
      subtitle={subtitle}
      search={search}
      onSearchChange={setSearch}
      onClose={() => {
        onClose();
        setSearch("");
      }}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {isBowlerMode
          ? filteredBowlers.map((player, index) => {
              const stat =
                bowlers.find((b) => b.playerId === player.id) ?? {
                  playerId: player.id,
                  playerName: player.name,
                  overs: 0,
                  balls: 0,
                  maidens: 0,
                  runs: 0,
                  wickets: 0,
                  economy: 0,
                };
              const display = getBowlerDisplayStats(stat, balls, matchOvers);
              return (
                <BowlerCard
                  key={player.id}
                  stat={stat}
                  oversLeft={display.oversLeft}
                  dots={display.dots}
                  selected={player.id === bowlerId}
                  recommended={player.id === suggestion?.playerId}
                  suggestionReason={
                    player.id === suggestion?.playerId ? suggestion?.reason : undefined
                  }
                  isCaptain={isBowlingCaptain(player)}
                  focused={index === focusIndex}
                  onSelect={() => handleBowlerSelect(player)}
                />
              );
            })
          : filteredBatters.map((player, index) => {
              const status = getBattingStatus(player.id, {
                strikerId,
                nonStrikerId,
                outIds,
                inXi: true,
              });
              const stat = buildBatterCardStats(
                player,
                batters,
                jerseyMap.get(player.id) ?? index + 1
              );
              const disabled =
                status === "out" ||
                status === "batting_striker" ||
                status === "batting_non_striker";
              return (
                <BatterCard
                  key={player.id}
                  stat={stat}
                  status={status}
                  disabled={disabled}
                  selected={
                    player.id === strikerId ||
                    player.id === nonStrikerId
                  }
                  recommended={player.id === suggestedBatter?.id}
                  isCaptain={isBattingCaptain(player)}
                  focused={index === focusIndex}
                  onSelect={() => handleBatterSelect(player)}
                />
              );
            })}
      </div>
      {!isBowlerMode && filteredBatters.length === 0 && (
        <p className="text-center text-slate-500 py-8">No batters available.</p>
      )}
      {isBowlerMode && filteredBowlers.length === 0 && (
        <p className="text-center text-slate-500 py-8">No eligible bowlers.</p>
      )}
    </SelectionSheet>
  );
}

/** Auto-open picker when only one choice — returns true if auto-handled */
export function tryAutoSelectSingleBatter(
  batters: RosterPlayer[],
  onSelect: (p: RosterPlayer) => void
): boolean {
  if (batters.length === 1) {
    onSelect(batters[0]);
    return true;
  }
  return false;
}

export function tryAutoSelectSingleBowler(
  bowlers: RosterPlayer[],
  onSelect: (p: RosterPlayer) => void
): boolean {
  if (bowlers.length === 1) {
    onSelect(bowlers[0]);
    return true;
  }
  return false;
}
