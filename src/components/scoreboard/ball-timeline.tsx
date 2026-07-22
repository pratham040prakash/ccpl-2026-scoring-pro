"use client";

import { motion } from "framer-motion";
import type { Ball } from "@/types";

function ballLabel(ball: Ball): string {
  if (ball.isWicket) return "W";
  if (ball.extra === "wide") return ball.runs > 1 ? `${ball.runs}Wd` : "Wd";
  if (ball.extra === "no_ball") return ball.batsmanRuns > 0 ? `${ball.runs}Nb` : "Nb";
  if (ball.batsmanRuns === 0 && ball.runs === 0) return "·";
  return String(ball.runs);
}

function ballColor(ball: Ball): string {
  if (ball.isWicket) return "bg-red-500 text-white";
  if (ball.extra === "wide" || ball.extra === "no_ball") return "bg-amber-500 text-black";
  if (ball.batsmanRuns === 4 || ball.runs === 4) return "bg-blue-500 text-white";
  if (ball.batsmanRuns === 6 || ball.runs === 6) return "bg-purple-500 text-white";
  if (ball.runs === 0) return "bg-slate-600 text-white";
  return "bg-emerald-600 text-white";
}

interface BallTimelineProps {
  balls: Ball[];
  max?: number;
  size?: "sm" | "md" | "lg";
}

export function BallTimeline({ balls, max = 12, size = "md" }: BallTimelineProps) {
  const recent = balls.slice(-max);
  const sizeClass =
    size === "lg" ? "w-14 h-14 text-lg" : size === "sm" ? "w-8 h-8 text-xs" : "w-10 h-10 text-sm";

  return (
    <div className="flex gap-2 flex-wrap items-center">
      {recent.map((ball) => (
        <motion.div
          key={ball.id}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          title={ball.commentary}
          className={`${sizeClass} rounded-full flex items-center justify-center font-black shrink-0 ${ballColor(ball)}`}
        >
          {ballLabel(ball)}
        </motion.div>
      ))}
    </div>
  );
}

export function BallTimelineStrip({ balls }: { balls: Ball[] }) {
  const currentOver = balls.length > 0 ? balls[balls.length - 1].overNumber : 0;
  const overBalls = balls.filter((b) => b.overNumber === currentOver);

  return (
    <div className="space-y-2">
      <p className="text-xs uppercase tracking-wider text-slate-500">This over</p>
      <BallTimeline balls={overBalls} max={12} />
      <p className="text-xs uppercase tracking-wider text-slate-500 mt-4">Recent</p>
      <BallTimeline balls={balls} max={6} />
    </div>
  );
}
