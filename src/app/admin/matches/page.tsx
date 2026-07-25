"use client";

import { useFixtures } from "@/hooks/use-tournament-data";
import { MatchScoringActions } from "@/components/admin/match-scoring-actions";

export default function AdminMatchesPage() {
  const { data: fixtures = [] } = useFixtures();

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-black mb-2">Match Control</h1>
      <p className="text-slate-500 mb-8">
        Start live scoring — every ball syncs instantly to public live, TV, and mobile views
      </p>

      <div className="space-y-4">
        {fixtures.map((f) => (
          <div
            key={f.id}
            className="glass-card p-5 flex flex-col gap-4"
          >
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs text-primary font-semibold uppercase">
                  {f.matchId} · {f.stage.replace(/_/g, " ")}
                </p>
                {f.status === "live" && <span className="live-badge text-[10px]">LIVE</span>}
              </div>
              <p className="font-bold mt-1">
                {f.teamAName} vs {f.teamBName}
              </p>
              <p className="text-sm text-slate-500">
                {f.date} · {f.startTime} · {f.overs} overs · {f.status}
              </p>
            </div>
            <MatchScoringActions fixture={f} compact />
          </div>
        ))}
      </div>
    </div>
  );
}
