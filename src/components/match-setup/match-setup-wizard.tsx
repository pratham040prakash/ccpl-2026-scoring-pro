"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Crown,
  Shield,
  Sparkles,
  Users,
} from "lucide-react";
import type { Fixture, TossDecision } from "@/types";
import {
  MATCH_SETUP_STEPS,
  type MatchSetupInput,
  type MatchSetupStep,
  type TeamPlayingMeta,
} from "@/types/match-setup";
import {
  deriveTeamsFromToss,
  defaultSetupDraft,
  formatStage,
  MAX_PLAYING_XI,
  MIN_PLAYING_XI,
  teamName,
  tossSummaryLines,
  validateMatchSetup,
  validatePlayingXi,
} from "@/lib/live/match-setup";
import { getTeamRoster } from "@/lib/live/player-roster";
import { PlayerAvatar } from "@/components/scorer/player-avatar";
import { cn } from "@/lib/utils";

type Props = {
  fixture: Fixture;
  onComplete: (input: MatchSetupInput) => Promise<void>;
  busy?: boolean;
};

function stepIndex(step: MatchSetupStep): number {
  return MATCH_SETUP_STEPS.findIndex((s) => s.id === step);
}

function TeamCard({
  name,
  selected,
  onSelect,
  subtitle,
}: {
  name: string;
  selected?: boolean;
  onSelect: () => void;
  subtitle?: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "glass-card p-5 text-left w-full min-h-[88px] border-2 transition-all active:scale-[0.98]",
        selected
          ? "border-emerald-500 ring-2 ring-emerald-500/30 bg-emerald-500/10"
          : "border-transparent hover:border-primary/30"
      )}
    >
      <p className="font-black text-lg">{name}</p>
      {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
      {selected && (
        <span className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-emerald-600">
          <Check className="w-3.5 h-3.5" /> Selected
        </span>
      )}
    </button>
  );
}

function RadioChoice({
  label,
  selected,
  onSelect,
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex items-center gap-3 w-full p-4 rounded-xl border-2 text-left font-semibold transition-all min-h-[56px]",
        selected
          ? "border-primary bg-primary/10 text-primary"
          : "border-slate-200/30 hover:border-primary/40"
      )}
    >
      <span
        className={cn(
          "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0",
          selected ? "border-primary bg-primary" : "border-slate-400"
        )}
      >
        {selected && <span className="w-2 h-2 rounded-full bg-white" />}
      </span>
      {label}
    </button>
  );
}

function PlayingXiPanel({
  teamLabel,
  roster,
  selectedIds,
  meta,
  onToggle,
  onMeta,
}: {
  teamLabel: string;
  roster: ReturnType<typeof getTeamRoster>;
  selectedIds: string[];
  meta: TeamPlayingMeta;
  onToggle: (id: string) => void;
  onMeta: (patch: Partial<TeamPlayingMeta>) => void;
}) {
  const setRole = (role: "captain" | "viceCaptain" | "wicketKeeper", id: string) => {
    const key =
      role === "captain"
        ? "captainId"
        : role === "viceCaptain"
          ? "viceCaptainId"
          : "wicketKeeperId";
    onMeta({ [key]: meta[key] === id ? undefined : id });
  };

  const toggleSub = (id: string) => {
    const subs = new Set(meta.substituteIds ?? []);
    if (subs.has(id)) subs.delete(id);
    else subs.add(id);
    onMeta({ substituteIds: [...subs] });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-bold flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          {teamLabel}
        </h3>
        <span
          className={cn(
            "text-xs font-bold px-2 py-1 rounded-full",
            selectedIds.length >= MIN_PLAYING_XI && selectedIds.length <= MAX_PLAYING_XI
              ? "bg-emerald-500/15 text-emerald-600"
              : "bg-amber-500/15 text-amber-600"
          )}
        >
          {selectedIds.length}/{MAX_PLAYING_XI} · min {MIN_PLAYING_XI}
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[420px] overflow-y-auto pr-1">
        {roster.map((player) => {
          const inXi = selectedIds.includes(player.id);
          const isSub = meta.substituteIds?.includes(player.id);
          return (
            <div
              key={player.id}
              className={cn(
                "rounded-xl border p-3 transition-all",
                inXi ? "border-emerald-500/50 bg-emerald-500/5" : "border-slate-200/20"
              )}
            >
              <button
                type="button"
                onClick={() => onToggle(player.id)}
                className="flex items-center gap-3 w-full text-left"
              >
                <PlayerAvatar name={player.name} size="sm" />
                <span className="font-semibold flex-1 truncate">{player.name}</span>
                {inXi && <Check className="w-4 h-4 text-emerald-500 shrink-0" />}
              </button>
              {inXi && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {(
                    [
                      ["captain", "C", Crown],
                      ["viceCaptain", "VC", Shield],
                      ["wicketKeeper", "WK", Shield],
                    ] as const
                  ).map(([role, label, Icon]) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setRole(role, player.id)}
                      className={cn(
                        "text-[10px] px-2 py-1 rounded-full border font-semibold inline-flex items-center gap-0.5",
                        meta[
                          role === "captain"
                            ? "captainId"
                            : role === "viceCaptain"
                              ? "viceCaptainId"
                              : "wicketKeeperId"
                        ] === player.id
                          ? "bg-amber-500/20 border-amber-500/50 text-amber-700"
                          : "border-slate-200/30 text-slate-500"
                      )}
                    >
                      <Icon className="w-3 h-3" /> {label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => toggleSub(player.id)}
                    className={cn(
                      "text-[10px] px-2 py-1 rounded-full border font-semibold",
                      isSub
                        ? "bg-slate-500/20 border-slate-400/50"
                        : "border-slate-200/30 text-slate-500"
                    )}
                  >
                    Sub
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PlayerPickGrid({
  players,
  selectedId,
  disabledIds,
  onSelect,
  label,
}: {
  players: { id: string; name: string }[];
  selectedId?: string;
  disabledIds?: string[];
  onSelect: (id: string) => void;
  label: string;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {players.map((p) => {
          const disabled = disabledIds?.includes(p.id);
          return (
            <button
              key={p.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(p.id)}
              className={cn(
                "flex items-center gap-3 p-4 rounded-xl border-2 min-h-[64px] transition-all",
                selectedId === p.id
                  ? "border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/20"
                  : "border-slate-200/20 hover:border-primary/30",
                disabled && "opacity-40 pointer-events-none"
              )}
            >
              <PlayerAvatar name={p.name} size="sm" />
              <span className="font-bold truncate">{p.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function MatchSetupWizard({ fixture, onComplete, busy }: Props) {
  const defaults = useMemo(() => defaultSetupDraft(fixture), [fixture]);
  const rosterA = useMemo(() => getTeamRoster(fixture.teamAName), [fixture.teamAName]);
  const rosterB = useMemo(() => getTeamRoster(fixture.teamBName), [fixture.teamBName]);

  const [step, setStep] = useState<MatchSetupStep>("info");
  const [validationError, setValidationError] = useState<string | null>(null);

  const [officials, setOfficials] = useState(defaults.officials ?? {});
  const [settings, setSettings] = useState(defaults.settings!);
  const [tossWinnerId, setTossWinnerId] = useState<string>("");
  const [tossDecision, setTossDecision] = useState<TossDecision | "">("");
  const [playingXiA, setPlayingXiA] = useState<string[]>(defaults.playingXiA ?? []);
  const [playingXiB, setPlayingXiB] = useState<string[]>(defaults.playingXiB ?? []);
  const [teamAMeta, setTeamAMeta] = useState<TeamPlayingMeta>(defaults.teamAMeta ?? {});
  const [teamBMeta, setTeamBMeta] = useState<TeamPlayingMeta>(defaults.teamBMeta ?? {});
  const [strikerId, setStrikerId] = useState("");
  const [nonStrikerId, setNonStrikerId] = useState("");
  const [openingBowlerId, setOpeningBowlerId] = useState("");

  const tossTeams = useMemo(() => {
    if (!tossWinnerId || !tossDecision) return null;
    return deriveTeamsFromToss(fixture, tossWinnerId, tossDecision);
  }, [fixture, tossWinnerId, tossDecision]);

  const battingRoster = useMemo(() => {
    if (!tossTeams) return [];
    const ids =
      tossTeams.battingTeamId === fixture.teamAId ? playingXiA : playingXiB;
    const roster = tossTeams.battingTeamId === fixture.teamAId ? rosterA : rosterB;
    return ids.map((id) => roster.find((p) => p.id === id)).filter(Boolean) as {
      id: string;
      name: string;
    }[];
  }, [tossTeams, playingXiA, playingXiB, fixture, rosterA, rosterB]);

  const bowlingRoster = useMemo(() => {
    if (!tossTeams) return [];
    const ids =
      tossTeams.bowlingTeamId === fixture.teamAId ? playingXiA : playingXiB;
    const roster = tossTeams.bowlingTeamId === fixture.teamAId ? rosterA : rosterB;
    return ids.map((id) => roster.find((p) => p.id === id)).filter(Boolean) as {
      id: string;
      name: string;
    }[];
  }, [tossTeams, playingXiA, playingXiB, fixture, rosterA, rosterB]);

  const buildInput = (): MatchSetupInput => ({
    tossWinnerId,
    tossDecision: tossDecision as TossDecision,
    playingXiA,
    playingXiB,
    teamAMeta,
    teamBMeta,
    strikerId,
    nonStrikerId,
    openingBowlerId,
    officials,
    settings,
  });

  const validateStep = (target: MatchSetupStep): string | null => {
    switch (target) {
      case "info":
        return null;
      case "toss":
        if (!tossWinnerId) return "Select the toss winner.";
        if (!tossDecision) return "Select bat first or bowl first.";
        return null;
      case "playing_xi": {
        const errA = validatePlayingXi(playingXiA, rosterA, fixture.teamAName);
        if (errA) return errA;
        return validatePlayingXi(playingXiB, rosterB, fixture.teamBName);
      }
      case "openers":
        if (!strikerId || !nonStrikerId) return "Select opening striker and non-striker.";
        if (strikerId === nonStrikerId) return "Striker and non-striker must be different.";
        return null;
      case "bowler":
        if (!openingBowlerId) return "Select the opening bowler.";
        return null;
      case "settings":
        if (!settings.overs || settings.overs < 1) return "Enter valid overs.";
        return null;
      case "review":
        return validateMatchSetup(fixture, buildInput());
      default:
        return null;
    }
  };

  const goNext = () => {
    const err = validateStep(step);
    if (err) {
      setValidationError(err);
      return;
    }
    setValidationError(null);
    const idx = stepIndex(step);
    if (idx < MATCH_SETUP_STEPS.length - 1) {
      setStep(MATCH_SETUP_STEPS[idx + 1].id);
    }
  };

  const goBack = () => {
    setValidationError(null);
    const idx = stepIndex(step);
    if (idx > 0) setStep(MATCH_SETUP_STEPS[idx - 1].id);
  };

  const toggleXi = (team: "A" | "B", id: string) => {
    const setter = team === "A" ? setPlayingXiA : setPlayingXiB;
    const current = team === "A" ? playingXiA : playingXiB;
    if (current.includes(id)) {
      setter(current.filter((x) => x !== id));
    } else if (current.length < MAX_PLAYING_XI) {
      setter([...current, id]);
    }
  };

  const handleStart = async () => {
    const err = validateMatchSetup(fixture, buildInput());
    if (err) {
      setValidationError(err);
      return;
    }
    setValidationError(null);
    await onComplete(buildInput());
  };

  const currentIdx = stepIndex(step);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <nav className="glass-card p-4 overflow-x-auto">
        <ol className="flex gap-2 min-w-max">
          {MATCH_SETUP_STEPS.map((s, i) => {
            const done = i < currentIdx;
            const active = s.id === step;
            return (
              <li key={s.id} className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all",
                    active && "bg-primary text-white shadow-lg shadow-primary/20",
                    done && !active && "bg-emerald-500/15 text-emerald-600",
                    !active && !done && "text-slate-500"
                  )}
                >
                  <span
                    className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-[10px] border",
                      active && "border-white/40 bg-white/20",
                      done && !active && "border-emerald-500/30",
                      !active && !done && "border-slate-300/30"
                    )}
                  >
                    {done ? <Check className="w-3.5 h-3.5" /> : i + 1}
                  </span>
                  <span className="hidden sm:inline">{s.label}</span>
                </div>
                {i < MATCH_SETUP_STEPS.length - 1 && (
                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      {validationError && (
        <div className="glass-card p-4 border border-red-500/40 bg-red-500/10 text-red-600 text-sm font-medium">
          {validationError}
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.2 }}
          className="glass-card p-6 sm:p-8 space-y-6"
        >
          {step === "info" && (
            <>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-primary mb-1">
                  CCPL 2026
                </p>
                <h2 className="text-2xl font-black">Match Information</h2>
              </div>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                {[
                  ["Match", fixture.matchId],
                  ["Stage", formatStage(fixture.stage)],
                  ["Venue", fixture.ground],
                  ["Date", fixture.date],
                  ["Time", fixture.startTime],
                  ["Overs", String(fixture.overs)],
                  ["Team A", fixture.teamAName],
                  ["Team B", fixture.teamBName],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-xl bg-slate-500/5 p-3">
                    <dt className="text-slate-500 text-xs font-semibold uppercase">{k}</dt>
                    <dd className="font-bold mt-0.5">{v}</dd>
                  </div>
                ))}
              </dl>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block space-y-1">
                  <span className="text-sm font-semibold">Scorer</span>
                  <input
                    className="w-full rounded-xl border border-slate-200/30 bg-transparent px-4 py-3 min-h-[48px]"
                    placeholder="Scorer name"
                    value={officials.scorer ?? ""}
                    onChange={(e) => setOfficials({ ...officials, scorer: e.target.value })}
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-sm font-semibold">Umpires</span>
                  <input
                    className="w-full rounded-xl border border-slate-200/30 bg-transparent px-4 py-3 min-h-[48px]"
                    placeholder="Umpire names"
                    value={officials.umpires ?? ""}
                    onChange={(e) => setOfficials({ ...officials, umpires: e.target.value })}
                  />
                </label>
              </div>
            </>
          )}

          {step === "toss" && (
            <>
              <h2 className="text-2xl font-black">Toss</h2>
              <div className="space-y-3">
                <p className="text-sm font-semibold text-slate-500">Toss winner</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <TeamCard
                    name={fixture.teamAName}
                    subtitle="Team A"
                    selected={tossWinnerId === fixture.teamAId}
                    onSelect={() => setTossWinnerId(fixture.teamAId)}
                  />
                  <TeamCard
                    name={fixture.teamBName}
                    subtitle="Team B"
                    selected={tossWinnerId === fixture.teamBId}
                    onSelect={() => setTossWinnerId(fixture.teamBId)}
                  />
                </div>
              </div>
              {tossWinnerId && (
                <div className="space-y-3 pt-2">
                  <p className="text-sm font-semibold text-slate-500">Toss decision</p>
                  <RadioChoice
                    label="Bat First"
                    selected={tossDecision === "bat"}
                    onSelect={() => setTossDecision("bat")}
                  />
                  <RadioChoice
                    label="Bowl First"
                    selected={tossDecision === "bowl"}
                    onSelect={() => setTossDecision("bowl")}
                  />
                </div>
              )}
              {tossTeams && (
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 space-y-2">
                  <p className="text-xs font-bold uppercase text-emerald-600 flex items-center gap-1">
                    <Sparkles className="w-4 h-4" /> Auto-calculated
                  </p>
                  {tossSummaryLines(fixture, tossWinnerId, tossDecision as TossDecision).map(
                    (line) => (
                      <p key={line} className="flex items-center gap-2 font-semibold">
                        <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                        {line}
                      </p>
                    )
                  )}
                </div>
              )}
            </>
          )}

          {step === "playing_xi" && (
            <>
              <h2 className="text-2xl font-black">Playing XI</h2>
              <p className="text-sm text-slate-500">
                Select {MIN_PLAYING_XI}–{MAX_PLAYING_XI} players per team. Mark captain, vice
                captain, wicket keeper, and substitutes.
              </p>
              <PlayingXiPanel
                teamLabel={fixture.teamAName}
                roster={rosterA}
                selectedIds={playingXiA}
                meta={teamAMeta}
                onToggle={(id) => toggleXi("A", id)}
                onMeta={(patch) => setTeamAMeta({ ...teamAMeta, ...patch })}
              />
              <PlayingXiPanel
                teamLabel={fixture.teamBName}
                roster={rosterB}
                selectedIds={playingXiB}
                meta={teamBMeta}
                onToggle={(id) => toggleXi("B", id)}
                onMeta={(patch) => setTeamBMeta({ ...teamBMeta, ...patch })}
              />
            </>
          )}

          {step === "openers" && tossTeams && (
            <>
              <h2 className="text-2xl font-black">Opening Batters</h2>
              <p className="text-sm text-slate-500">
                {tossTeams.battingTeamName} bats first — select striker and non-striker.
              </p>
              <PlayerPickGrid
                label="Striker"
                players={battingRoster}
                selectedId={strikerId}
                disabledIds={nonStrikerId ? [nonStrikerId] : []}
                onSelect={setStrikerId}
              />
              <PlayerPickGrid
                label="Non-striker"
                players={battingRoster}
                selectedId={nonStrikerId}
                disabledIds={strikerId ? [strikerId] : []}
                onSelect={setNonStrikerId}
              />
            </>
          )}

          {step === "bowler" && tossTeams && (
            <>
              <h2 className="text-2xl font-black">Opening Bowler</h2>
              <p className="text-sm text-slate-500">
                {tossTeams.bowlingTeamName} bowls first.
              </p>
              <PlayerPickGrid
                label="Opening bowler"
                players={bowlingRoster}
                selectedId={openingBowlerId}
                onSelect={setOpeningBowlerId}
              />
            </>
          )}

          {step === "settings" && (
            <>
              <h2 className="text-2xl font-black">Match Settings</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="space-y-1">
                  <span className="text-sm font-semibold">Overs</span>
                  <input
                    type="number"
                    min={1}
                    className="w-full rounded-xl border border-slate-200/30 bg-transparent px-4 py-3"
                    value={settings.overs}
                    onChange={(e) =>
                      setSettings({ ...settings, overs: parseInt(e.target.value, 10) || 1 })
                    }
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-semibold">Powerplay (overs)</span>
                  <input
                    type="number"
                    min={0}
                    className="w-full rounded-xl border border-slate-200/30 bg-transparent px-4 py-3"
                    value={settings.powerplayOvers ?? 2}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        powerplayOvers: parseInt(e.target.value, 10) || 0,
                      })
                    }
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-semibold">Ball type</span>
                  <select
                    className="w-full rounded-xl border border-slate-200/30 bg-transparent px-4 py-3"
                    value={settings.ballType ?? "tennis"}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        ballType: e.target.value as MatchSetupInput["settings"]["ballType"],
                      })
                    }
                  >
                    <option value="tennis">Tennis</option>
                    <option value="leather">Leather</option>
                    <option value="synthetic">Synthetic</option>
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-semibold">Pitch</span>
                  <select
                    className="w-full rounded-xl border border-slate-200/30 bg-transparent px-4 py-3"
                    value={settings.pitch ?? "balanced"}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        pitch: e.target.value as MatchSetupInput["settings"]["pitch"],
                      })
                    }
                  >
                    <option value="balanced">Balanced</option>
                    <option value="dry">Dry</option>
                    <option value="green">Green</option>
                    <option value="dusty">Dusty</option>
                  </select>
                </label>
                <label className="space-y-1 sm:col-span-2">
                  <span className="text-sm font-semibold">Ground</span>
                  <input
                    className="w-full rounded-xl border border-slate-200/30 bg-transparent px-4 py-3"
                    value={settings.ground ?? fixture.ground}
                    onChange={(e) => setSettings({ ...settings, ground: e.target.value })}
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-semibold">Weather</span>
                  <input
                    className="w-full rounded-xl border border-slate-200/30 bg-transparent px-4 py-3"
                    placeholder="Clear / Overcast"
                    value={settings.weather ?? ""}
                    onChange={(e) => setSettings({ ...settings, weather: e.target.value })}
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-semibold">Match type</span>
                  <input
                    className="w-full rounded-xl border border-slate-200/30 bg-transparent px-4 py-3"
                    value={settings.matchType ?? formatStage(fixture.stage)}
                    onChange={(e) => setSettings({ ...settings, matchType: e.target.value })}
                  />
                </label>
              </div>
              <div className="flex flex-wrap gap-4 pt-2">
                <label className="flex items-center gap-3 cursor-pointer min-h-[48px]">
                  <input
                    type="checkbox"
                    checked={settings.superOverEnabled ?? true}
                    onChange={(e) =>
                      setSettings({ ...settings, superOverEnabled: e.target.checked })
                    }
                    className="w-5 h-5 rounded"
                  />
                  <span className="font-semibold">Enable Super Over</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer min-h-[48px]">
                  <input
                    type="checkbox"
                    checked={settings.dlsEnabled ?? false}
                    onChange={(e) => setSettings({ ...settings, dlsEnabled: e.target.checked })}
                    className="w-5 h-5 rounded"
                  />
                  <span className="font-semibold">Enable DLS (optional)</span>
                </label>
              </div>
            </>
          )}

          {step === "review" && tossTeams && (
            <>
              <h2 className="text-2xl font-black">Match Summary</h2>
              <div className="rounded-2xl border border-slate-200/20 p-6 space-y-4 font-medium">
                <p className="text-center text-xs font-bold uppercase text-primary">CCPL 2026</p>
                <p className="text-center text-xl font-black">{fixture.matchId}</p>
                <p className="text-center text-lg">
                  {fixture.teamAName}
                  <span className="text-slate-500 mx-2">vs</span>
                  {fixture.teamBName}
                </p>
                <hr className="border-slate-200/20" />
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-slate-500 text-xs">Venue</p>
                    <p>{settings.ground ?? fixture.ground}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs">Overs</p>
                    <p>{settings.overs}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-slate-500 text-xs">Toss</p>
                    <p>
                      {teamName(fixture, tossWinnerId)} won the toss ·{" "}
                      {tossDecision === "bat" ? "Bat First" : "Bowl First"}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs">Batting first</p>
                    <p className="font-bold text-emerald-600">{tossTeams.battingTeamName}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs">Bowling first</p>
                    <p className="font-bold text-primary">{tossTeams.bowlingTeamName}</p>
                  </div>
                </div>
                <hr className="border-slate-200/20" />
                <div>
                  <p className="text-slate-500 text-xs mb-1">Opening batters</p>
                  <p>
                    {battingRoster.find((p) => p.id === strikerId)?.name ?? "—"} ·{" "}
                    {battingRoster.find((p) => p.id === nonStrikerId)?.name ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs mb-1">Opening bowler</p>
                  <p>{bowlingRoster.find((p) => p.id === openingBowlerId)?.name ?? "—"}</p>
                </div>
              </div>
            </>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={goBack}
          disabled={currentIdx === 0 || busy}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl glass-card font-semibold disabled:opacity-40 min-h-[48px]"
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        {step !== "review" ? (
          <button
            type="button"
            onClick={goNext}
            disabled={busy}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-white font-bold min-h-[48px]"
          >
            Continue <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleStart}
            disabled={busy}
            className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-emerald-600 text-white font-black min-h-[52px] disabled:opacity-50"
          >
            {busy ? "Starting…" : "Start Match"}
          </button>
        )}
      </div>
    </div>
  );
}
