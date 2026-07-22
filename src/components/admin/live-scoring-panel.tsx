"use client";

import { useState } from "react";
import Link from "next/link";
import { PenLine, Radio, Smartphone, ListOrdered, Tv } from "lucide-react";
import type { Fixture } from "@/types";

type Props = {
  fixtures?: Fixture[];
  compact?: boolean;
};

export function LiveScoringPanel({ fixtures = [], compact = false }: Props) {
  const scheduled = fixtures.filter((f) => f.status === "scheduled" || f.status === "live");
  const [fixtureId, setFixtureId] = useState(scheduled[0]?.id ?? fixtures[0]?.id ?? "");

  const selected = fixtures.find((f) => f.id === fixtureId);

  return (
    <div className={compact ? "space-y-4" : "glass-card p-6 space-y-5"}>
      {!compact && (
        <div>
          <h2 className="text-xl font-bold mb-1 flex items-center gap-2">
            <Radio className="w-5 h-5 text-accent" /> Live Scoring
          </h2>
          <p className="text-sm text-slate-500">
            Firestore realtime — one ball update syncs instantly to public live, TV, and mobile views.
          </p>
        </div>
      )}

      {fixtures.length > 0 && (
        <div>
          <label htmlFor="live-fixture" className="block text-sm font-medium mb-1.5">
            Match
          </label>
          <select
            id="live-fixture"
            value={fixtureId}
            onChange={(e) => setFixtureId(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200/30 bg-white/50 dark:bg-slate-900/50 text-sm"
          >
            {fixtures.map((f) => (
              <option key={f.id} value={f.id}>
                {f.matchId} · {f.teamAName} vs {f.teamBName} ({f.overs} ov)
              </option>
            ))}
          </select>
        </div>
      )}

      {selected && (
        <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
          <Link
            href={`/admin/matches/${selected.id}/score`}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:brightness-110"
          >
            <PenLine className="w-4 h-4" />
            Open Live Scorer
          </Link>
          <Link
            href={`/match/${selected.id}/score/mobile`}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-accent text-white font-semibold"
          >
            <Smartphone className="w-4 h-4" />
            Mobile Scorer
          </Link>
          <Link
            href={`/live/${selected.id}`}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-slate-200/30 font-semibold"
          >
            <Radio className="w-4 h-4" />
            Public Live
          </Link>
          <Link
            href={`/match/${selected.id}/tv`}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-slate-200/30 font-semibold"
          >
            <Tv className="w-4 h-4" />
            TV Mode
          </Link>
        </div>
      )}

      <div className="rounded-xl border border-slate-200/20 bg-slate-500/5 p-4">
        <p className="text-sm font-semibold flex items-center gap-2 mb-3">
          <ListOrdered className="w-4 h-4 text-primary" /> Workflow
        </p>
        <ol className="text-sm text-slate-600 dark:text-slate-400 space-y-2 list-decimal list-inside">
          <li>Open <strong>Live Scorer</strong> and tap Start Match.</li>
          <li>Score each ball — runs, extras, wickets update all viewers in realtime.</li>
          <li>Use Undo or Restore to Over X.Y if a mistake is made (full audit trail).</li>
          <li>When complete, publish final result in Manual Entry for standings.</li>
        </ol>
      </div>
    </div>
  );
}
