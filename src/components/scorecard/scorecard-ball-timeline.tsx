import type { Ball } from "@/types";

function ballIcon(ball: Ball): string {
  if (ball.isWicket) return "W";
  if (ball.extra === "wide") return "Wd";
  if (ball.extra === "no_ball") return "Nb";
  if (ball.batsmanRuns === 6) return "6";
  if (ball.batsmanRuns === 4) return "4";
  if (ball.isLegalDelivery && ball.batsmanRuns === 0) return "•";
  return String(ball.runs);
}

function ballClass(ball: Ball): string {
  if (ball.isWicket) return "bg-red-500 text-white";
  if (ball.batsmanRuns === 6) return "bg-purple-600 text-white";
  if (ball.batsmanRuns === 4) return "bg-blue-500 text-white";
  if (ball.extra === "wide" || ball.extra === "no_ball") return "bg-amber-500 text-white";
  if (ball.isLegalDelivery && ball.batsmanRuns === 0) return "bg-slate-600 text-white";
  return "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-white";
}

export function ScorecardBallTimeline({ balls }: { balls: Ball[] }) {
  if (balls.length === 0) return null;

  const reversed = [...balls].reverse();

  return (
    <div className="divide-y divide-slate-200/40 dark:divide-slate-700/40 max-h-[28rem] overflow-y-auto">
      {reversed.map((ball) => (
        <div key={ball.id} className="px-4 py-3 flex gap-3">
          <span
            className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${ballClass(ball)}`}
          >
            {ballIcon(ball)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">
              {ball.overNumber}.{ball.ballNumber} · {ball.bowlerName} to {ball.strikerName}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">
              {ball.commentary || `${ball.runs} run${ball.runs === 1 ? "" : "s"}`}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {new Date(ball.timestamp).toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
