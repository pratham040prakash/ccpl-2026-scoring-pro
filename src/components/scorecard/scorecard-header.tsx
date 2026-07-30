"use client";

import type { Fixture, Match } from "@/types";
import { stageLabel, tossSummary } from "@/lib/match/scorecard-analytics";
import { formatDate, formatTime } from "@/lib/utils";
import { MapPin, Calendar, Clock, Trophy } from "lucide-react";

interface ScorecardHeaderProps {
  fixture: Fixture;
  match: Match;
  isLive: boolean;
}

export function ScorecardHeader({ fixture, match, isLive }: ScorecardHeaderProps) {
  const toss = tossSummary(match);

  return (
    <div className="glass-card overflow-hidden">
      <div className="gradient-hero px-4 py-5 sm:px-6 text-white">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide">
            <Trophy className="w-3 h-3" /> CCPL 2026
          </span>
          {isLive && <span className="live-badge">LIVE</span>}
          {!isLive && match.status === "completed" && (
            <span className="rounded-full bg-emerald-500/90 px-2.5 py-0.5 text-xs font-bold uppercase">
              Result
            </span>
          )}
          <span className="text-xs font-semibold uppercase opacity-90">
            {stageLabel(fixture.stage)} · {fixture.matchId}
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black leading-tight">
          {fixture.teamAName} vs {fixture.teamBName}
        </h1>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm opacity-90">
          <span className="inline-flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" /> {fixture.ground}
          </span>
          <span className="inline-flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" /> {formatDate(fixture.date)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> {formatTime(fixture.startTime)}
            {fixture.endTime ? ` – ${formatTime(fixture.endTime)}` : ""}
          </span>
          <span>{fixture.overs} overs</span>
        </div>
      </div>

      <div className="px-4 py-3 sm:px-6 bg-slate-50/80 dark:bg-slate-900/40 border-t border-slate-200/40 dark:border-slate-700/40 text-sm space-y-1">
        {match.result?.winnerName && (
          <p className="font-semibold text-emerald-700 dark:text-emerald-400">
            {match.result.summary || `${match.result.winnerName} won by ${match.result.margin}`}
          </p>
        )}
        {toss && <p className="text-slate-600 dark:text-slate-300">{toss}</p>}
      </div>
    </div>
  );
}
