"use client";

import { useLeaderboards } from "@/hooks/use-leaderboards";
import { Trophy, Target, Zap } from "lucide-react";

export default function LeaderboardsPage() {
  const { boards, loading, source } = useLeaderboards();

  const sections = [
    { key: "orangeCap", title: "Orange Cap", subtitle: "Most Runs", icon: Trophy, color: "text-orange-500" },
    { key: "purpleCap", title: "Purple Cap", subtitle: "Most Wickets", icon: Target, color: "text-purple-500" },
    { key: "mostSixes", title: "Most Sixes", subtitle: "Maximum Sixes", icon: Zap, color: "text-blue-500" },
    { key: "mostFours", title: "Most Fours", subtitle: "Maximum Fours", icon: Zap, color: "text-emerald-500" },
    { key: "bestStrikeRate", title: "Best Strike Rate", subtitle: "Min 20 balls", icon: Trophy, color: "text-amber-500" },
    { key: "bestEconomy", title: "Best Economy", subtitle: "Min 12 balls", icon: Target, color: "text-cyan-500" },
    { key: "mvp", title: "Most Valuable Player", subtitle: "MVP Points", icon: Trophy, color: "text-yellow-500" },
  ] as const;

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-black mb-2">Leaderboards</h1>
      <p className="text-slate-500 mb-2">
        Auto-updated from live ball-by-ball scoring
      </p>
      {source === "firestore" && (
        <p className="text-xs text-emerald-600 mb-8">Live tournament data</p>
      )}
      {source === "demo" && !loading && (
        <p className="text-xs text-amber-600 mb-8">Demo data — complete a live match to populate</p>
      )}

      {loading ? (
        <p className="text-slate-500 text-center py-20">Loading leaderboards…</p>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sections.map(({ key, title, subtitle, icon: Icon, color }) => {
            const entries = boards[key]?.slice(0, 5) || [];
            return (
              <div key={key} className="glass-card p-5">
                <div className="flex items-center gap-3 mb-4">
                  <Icon className={`w-6 h-6 ${color}`} />
                  <div>
                    <h3 className="font-bold">{title}</h3>
                    <p className="text-xs text-slate-500">{subtitle}</p>
                  </div>
                </div>
                {entries.length === 0 ? (
                  <p className="text-sm text-slate-500 py-4 text-center">No data yet</p>
                ) : (
                  <div className="space-y-2">
                    {entries.map((e) => (
                      <div
                        key={e.playerId}
                        className="flex items-center justify-between py-2 border-b border-slate-200/10 last:border-0"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                            {e.rank}
                          </span>
                          <div>
                            <p className="font-medium text-sm">{e.playerName}</p>
                            <p className="text-xs text-slate-500">{e.teamName}</p>
                          </div>
                        </div>
                        <span className="font-bold text-primary">{e.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
