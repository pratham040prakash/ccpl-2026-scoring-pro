"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { Ball, BatterScore, BowlerScore, Innings } from "@/types";
import { formatOvers } from "@/lib/utils";
import { WormChart, RunRateChart, WinProbGauge } from "./charts";

interface LiveScoreboardProps {
  teamName: string;
  innings?: Innings;
  target?: number;
  batters: BatterScore[];
  bowlers: BowlerScore[];
  lastSixBalls: Ball[];
  wormData: { over: number; runs: number; wickets: number }[];
  runRateData: { over: number; runRate: number }[];
  winProbability?: number;
  compact?: boolean;
}

export function LiveScoreboard({
  teamName,
  innings,
  target,
  batters,
  bowlers,
  lastSixBalls,
  wormData,
  runRateData,
  winProbability,
  compact,
}: LiveScoreboardProps) {
  if (!innings) {
    return (
      <div className="glass-card p-8 text-center text-slate-500">
        Match not started yet
      </div>
    );
  }

  const crr = innings.runRate.toFixed(2);
  const rrr = innings.requiredRunRate?.toFixed(2);

  return (
    <div className="space-y-4">
      <motion.div
        className="glass-card p-6 gradient-hero text-white"
        layout
      >
        <p className="text-sm opacity-80 mb-1">{teamName}</p>
        <div className="flex items-baseline gap-3">
          <span className="text-5xl sm:text-6xl font-black tabular-nums">
            {innings.runs}/{innings.wickets}
          </span>
          <span className="text-xl opacity-90">
            ({formatOvers(innings.overs, innings.balls)} ov)
          </span>
        </div>
        {target && (
          <p className="mt-2 text-sm opacity-90">
            Target: {target} · Need {target - innings.runs} from{" "}
            {Math.max(0, (innings.overs * 6 + innings.balls) - (innings.overs * 6 + innings.balls))} balls
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <span>CRR: {crr}</span>
          {rrr && <span>RRR: {rrr}</span>}
          {innings.projectedScore && <span>Projected: {Math.round(innings.projectedScore)}</span>}
        </div>
      </motion.div>

      {!compact && winProbability !== undefined && (
        <div className="glass-card p-4">
          <WinProbGauge probability={winProbability} />
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="glass-card p-4">
          <h4 className="font-semibold mb-3 text-sm uppercase tracking-wider text-slate-500">Batters</h4>
          {batters.filter((b) => !b.isOut).slice(0, 2).map((b) => (
            <div key={b.playerId} className="flex justify-between py-2 border-b border-slate-200/10 last:border-0">
              <span className="font-medium">{b.playerName}*</span>
              <span className="font-mono">{b.runs} ({b.balls})</span>
            </div>
          ))}
          {innings.partnership && (
            <p className="mt-3 text-xs text-slate-500">
              Partnership: {innings.partnership.runs} ({innings.partnership.balls} balls)
            </p>
          )}
        </div>

        <div className="glass-card p-4">
          <h4 className="font-semibold mb-3 text-sm uppercase tracking-wider text-slate-500">Bowler</h4>
          {bowlers.slice(0, 1).map((b) => (
            <div key={b.playerId} className="flex justify-between py-2">
              <span className="font-medium">{b.playerName}</span>
              <span className="font-mono">
                {Math.floor(b.balls / 6)}.{b.balls % 6}-{b.runs}-{b.wickets}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-card p-4">
        <h4 className="font-semibold mb-3 text-sm uppercase tracking-wider text-slate-500">Last 6 Balls</h4>
        <div className="flex gap-2 flex-wrap">
          <AnimatePresence>
            {lastSixBalls.slice(-6).map((ball) => (
              <motion.span
                key={ball.id}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                  ball.isWicket
                    ? "bg-red-500 text-white"
                    : ball.runs === 4
                      ? "bg-blue-500 text-white"
                      : ball.runs === 6
                        ? "bg-purple-500 text-white"
                        : "bg-slate-700 text-white"
                }`}
              >
                {ball.isWicket ? "W" : ball.runs}
              </motion.span>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {!compact && (
        <>
          <div className="glass-card p-4">
            <h4 className="font-semibold mb-3 text-sm">Worm Graph</h4>
            <WormChart data={wormData} />
          </div>
          <div className="glass-card p-4">
            <h4 className="font-semibold mb-3 text-sm">Run Rate</h4>
            <RunRateChart data={runRateData} />
          </div>
        </>
      )}
    </div>
  );
}
