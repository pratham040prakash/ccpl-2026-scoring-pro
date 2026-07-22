"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink, Radio, Smartphone, ListOrdered } from "lucide-react";
import type { Fixture } from "@/types";

const LIVE_SCORER_URL = "https://cricketscore.in.net/";

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
            Score ball-by-ball online, then publish the final result to CCPL standings below.
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
          {selected && (
            <p className="text-xs text-slate-500 mt-2">
              Copy team names into the live scorer: <strong>{selected.teamAName}</strong> vs{" "}
              <strong>{selected.teamBName}</strong> · max <strong>{selected.overs}</strong> overs
            </p>
          )}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <a
          href={LIVE_SCORER_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-accent text-white font-semibold hover:brightness-110"
        >
          <ExternalLink className="w-4 h-4" />
          Open cricketscore.in.net
        </a>
        {selected && (
          <Link
            href={`/match/${selected.id}/score/mobile`}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-slate-200/30 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Smartphone className="w-4 h-4" />
            CCPL Mobile Scorer
          </Link>
        )}
      </div>

      <div className="rounded-xl border border-slate-200/20 bg-slate-500/5 p-4">
        <p className="text-sm font-semibold flex items-center gap-2 mb-3">
          <ListOrdered className="w-4 h-4 text-primary" /> Workflow
        </p>
        <ol className="text-sm text-slate-600 dark:text-slate-400 space-y-2 list-decimal list-inside">
          <li>
            Open{" "}
            <a href={LIVE_SCORER_URL} target="_blank" rel="noopener noreferrer" className="text-primary underline">
              cricketscore.in.net
            </a>{" "}
            on your phone during the match.
          </li>
          <li>Set max overs and enter both team names (from the match selector above).</li>
          <li>Score each ball — Dot, runs, Wide, No ball, Wicket.</li>
          <li>When the match ends, note final runs/wickets for both teams.</li>
          <li>
            Switch to the <strong>Manual Entry</strong> tab on this page and save the result — standings update on
            the CCPL site.
          </li>
        </ol>
      </div>

      <p className="text-xs text-slate-500">
        Live counter scores stay on cricketscore.in.net until you enter the final result here. Optional: use{" "}
        <strong>Share match code</strong> on their site so spectators can follow live.
      </p>
    </div>
  );
}
