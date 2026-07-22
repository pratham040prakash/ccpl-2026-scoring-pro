"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Calendar, MapPin, Clock, ChevronRight, Radio } from "lucide-react";
import type { Fixture } from "@/types";
import { cn, formatDate, formatTime } from "@/lib/utils";
import { useMatchScore } from "@/hooks/use-tournament-data";

interface FixtureCardProps {
  fixture: Fixture;
  compact?: boolean;
}

const STAGE_LABELS: Record<string, string> = {
  round_1: "Round 1",
  integration: "Round 2",
  quarter_final: "Quarter-Final",
  semi_final: "Semi-Final",
  final: "Final",
};

export function FixtureCard({ fixture, compact }: FixtureCardProps) {
  const isLive = fixture.status === "live";
  const score = useMatchScore(fixture.id);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("glass-card p-4 hover:border-primary/30 transition-colors", isLive && "ring-2 ring-red-500/50")}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-primary">
          {STAGE_LABELS[fixture.stage] || fixture.stage} · {fixture.matchId}
        </span>
        {isLive && (
          <span className="flex items-center gap-1 text-xs font-bold text-red-500 animate-pulse">
            <Radio className="w-3 h-3" /> LIVE
          </span>
        )}
        {fixture.status === "completed" && (
          <span className="text-xs text-emerald-500 font-medium">Completed</span>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-semibold">{fixture.teamAName}</span>
          {score && (
            <span className="font-mono text-sm font-bold text-primary">
              {score.teamARuns}/{score.teamAWickets}
            </span>
          )}
        </div>
        <div className="text-center text-xs text-slate-500 font-medium">vs</div>
        <div className="flex items-center justify-between">
          <span className="font-semibold">{fixture.teamBName}</span>
          {score && (
            <span className="font-mono text-sm font-bold text-primary">
              {score.teamBRuns}/{score.teamBWickets}
            </span>
          )}
        </div>
        {score && (
          <p className="text-xs text-emerald-600 text-center pt-1">
            {score.winnerName} won by {score.margin}
          </p>
        )}
      </div>

      {!compact && fixture.endTime && (
        <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" /> {formatDate(fixture.date)}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" /> {formatTime(fixture.startTime)} – {formatTime(fixture.endTime)}
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" /> {fixture.ground}
          </span>
          <span className="font-medium text-primary">{fixture.overs} overs</span>
        </div>
      )}

      {!compact && !fixture.endTime && (
        <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" /> {formatDate(fixture.date)}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" /> {formatTime(fixture.startTime)}
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" /> {fixture.ground}
          </span>
        </div>
      )}

      {fixture.matchDocId && (
        <Link
          href={`/live/${fixture.matchDocId}`}
          className="mt-3 flex items-center justify-center gap-1 text-sm text-primary font-medium hover:underline"
        >
          View Live <ChevronRight className="w-4 h-4" />
        </Link>
      )}
    </motion.div>
  );
}

export function FixtureList({ fixtures, title }: { fixtures: Fixture[]; title: string }) {
  if (fixtures.length === 0) {
    return (
      <div className="glass-card p-8 text-center text-slate-500">
        No {title.toLowerCase()} fixtures
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-lg font-bold mb-4">{title}</h3>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {fixtures.map((f) => (
          <FixtureCard key={f.id} fixture={f} />
        ))}
      </div>
    </div>
  );
}
