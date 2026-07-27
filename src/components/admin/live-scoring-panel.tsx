"use client";

import { useEffect, useState } from "react";
import { ListOrdered, Radio } from "lucide-react";
import type { Fixture } from "@/types";
import { MatchScoringActions } from "@/components/admin/match-scoring-actions";

type Props = {
  fixtures?: Fixture[];
  compact?: boolean;
};

export function LiveScoringPanel({ fixtures = [], compact = false }: Props) {
  const startable = fixtures.filter(
    (f) => !f.placeholderA && !f.placeholderB && f.teamAId && f.teamBId
  );
  const scheduled = startable.filter((f) => f.status === "scheduled" || f.status === "live");
  const pickFrom = scheduled.length ? scheduled : startable;
  const [fixtureId, setFixtureId] = useState(pickFrom[0]?.id ?? fixtures[0]?.id ?? "");

  useEffect(() => {
    if (!fixtureId && fixtures[0]?.id) {
      setFixtureId(fixtures[0].id);
    }
  }, [fixtureId, fixtures]);

  const selected = fixtures.find((f) => f.id === fixtureId);

  return (
    <div className={compact ? "space-y-4" : "glass-card p-6 space-y-5"}>
      {!compact && (
        <div>
          <h2 className="text-xl font-bold mb-1 flex items-center gap-2">
            <Radio className="w-5 h-5 text-accent" /> Live Scoring
          </h2>
          <p className="text-sm text-slate-500">
            Open Match Setup Wizard — toss, batting first, playing XI, then live scoring.
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
                {f.matchId} · {f.teamAName} vs {f.teamBName} ({f.overs} ov) · {f.status}
              </option>
            ))}
          </select>
        </div>
      )}

      {selected && <MatchScoringActions fixture={selected} compact={compact} />}

      <div className="rounded-xl border border-slate-200/20 bg-slate-500/5 p-4">
        <p className="text-sm font-semibold flex items-center gap-2 mb-3">
          <ListOrdered className="w-4 h-4 text-primary" /> Workflow
        </p>
        <ol className="text-sm text-slate-600 dark:text-slate-400 space-y-2 list-decimal list-inside">
          <li>
            Tap <strong>Match Setup Wizard</strong>, complete toss (winner + batting first), playing XI,
            and openers.
          </li>
          <li>Score each ball in Live Scorer or Mobile — all viewers update in realtime.</li>
          <li>Use Undo or Restore to Over X.Y if a mistake is made (full audit trail).</li>
          <li>When complete, publish final result in Manual Entry for standings.</li>
        </ol>
      </div>
    </div>
  );
}
