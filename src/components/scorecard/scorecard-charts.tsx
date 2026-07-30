"use client";

import type { InningsAnalytics } from "@/lib/match/scorecard-analytics";
import { WormChart, RunRateChart } from "@/components/scoreboard/charts";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface ScorecardChartsProps {
  analytics: InningsAnalytics;
  winProbability?: number;
  projectedScore?: number;
}

export function ManhattanChart({ data }: { data: { over: number; runs: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data}>
        <XAxis dataKey="over" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        <Bar dataKey="runs" fill="#0066cc" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ScorecardCharts({ analytics, winProbability, projectedScore }: ScorecardChartsProps) {
  return (
    <div className="grid lg:grid-cols-2 gap-4 p-4">
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 px-1">
          Worm Graph
        </h3>
        <WormChart data={analytics.wormData} />
      </div>
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 px-1">
          Run Rate
        </h3>
        <RunRateChart data={analytics.runRateData} />
      </div>
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 px-1">
          Manhattan (Runs per Over)
        </h3>
        <ManhattanChart data={analytics.manhattanData} />
      </div>
      <div className="space-y-3">
        {winProbability != null && (
          <div className="glass-card p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Win Probability
            </p>
            <div className="relative h-4 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500"
                style={{ width: `${winProbability}%` }}
              />
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">
                {winProbability}%
              </span>
            </div>
          </div>
        )}
        {projectedScore != null && (
          <div className="glass-card p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Projected Score</p>
            <p className="text-3xl font-black text-primary mt-1">{Math.round(projectedScore)}</p>
          </div>
        )}
      </div>
    </div>
  );
}
