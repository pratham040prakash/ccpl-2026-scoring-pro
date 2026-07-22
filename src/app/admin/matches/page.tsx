"use client";

import Link from "next/link";
import { useFixtures } from "@/hooks/use-tournament-data";
import { Play, Smartphone, Tv, ExternalLink } from "lucide-react";

const LIVE_SCORER_URL = "https://cricketscore.in.net/";

export default function AdminMatchesPage() {
  const { data: fixtures = [] } = useFixtures();
  const scheduled = fixtures.filter((f) => f.status === "scheduled");

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-black mb-2">Match Control</h1>
      <p className="text-slate-500 mb-8">Start, score, and manage live matches</p>

      <div className="space-y-4">
        {scheduled.map((f) => (
          <div key={f.id} className="glass-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs text-primary font-semibold uppercase">{f.matchId} · {f.stage.replace(/_/g, " ")}</p>
              <p className="font-bold mt-1">{f.teamAName} vs {f.teamBName}</p>
              <p className="text-sm text-slate-500">{f.date} · {f.startTime} · {f.overs} overs</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <a
                href={LIVE_SCORER_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium"
              >
                <ExternalLink className="w-4 h-4" /> Live Counter
              </a>
              <Link
                href={`/match/${f.id}/score/mobile`}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium"
              >
                <Smartphone className="w-4 h-4" /> Mobile Scorer
              </Link>
              <Link
                href={`/match/${f.id}/tv`}
                className="flex items-center gap-2 px-4 py-2 rounded-lg glass-card text-sm font-medium"
              >
                <Tv className="w-4 h-4" /> TV Mode
              </Link>
              <Link
                href={`/live/${f.id}`}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium"
              >
                <Play className="w-4 h-4" /> Live Score
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
