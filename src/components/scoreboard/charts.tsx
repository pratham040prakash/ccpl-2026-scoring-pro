"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";

interface WormChartProps {
  data: { over: number; runs: number; wickets: number }[];
}

export function WormChart({ data }: WormChartProps) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="wormGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#0066cc" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#0066cc" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="over" tick={{ fontSize: 11 }} label={{ value: "Over", position: "insideBottom", offset: -5, fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        <Area type="monotone" dataKey="runs" stroke="#0066cc" fill="url(#wormGrad)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

interface RunRateChartProps {
  data: { over: number; runRate: number }[];
}

export function RunRateChart({ data }: RunRateChartProps) {
  return (
    <ResponsiveContainer width="100%" height={160}>
      <LineChart data={data}>
        <XAxis dataKey="over" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        <Line type="monotone" dataKey="runRate" stroke="#ff6b00" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

interface WinProbChartProps {
  probability: number;
}

export function WinProbGauge({ probability }: WinProbChartProps) {
  return (
    <div className="relative w-full h-4 bg-slate-700 rounded-full overflow-hidden">
      <div
        className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-accent transition-all duration-500 rounded-full"
        style={{ width: `${probability}%` }}
      />
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white mix-blend-difference">
        Win Prob: {probability}%
      </span>
    </div>
  );
}
