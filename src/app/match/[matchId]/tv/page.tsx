"use client";

import { use, useEffect, useState } from "react";
import QRCode from "qrcode";
import { motion, AnimatePresence } from "framer-motion";
import { Maximize2 } from "lucide-react";
import { useLiveMatch } from "@/hooks/use-live-match";
import { BallTimeline } from "@/components/scoreboard/ball-timeline";
import { aggregateBatterScores, aggregateBowlerScores } from "@/lib/engine/statistics";
import { formatOvers, getShareUrl } from "@/lib/utils";

export default function TVScoreboardPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = use(params);
  const live = useLiveMatch(matchId);
  const { fixture, match, currentInnings, balls, lastSixBalls } = live;
  const [qrDataUrl, setQrDataUrl] = useState("");

  useEffect(() => {
    if (typeof window === "undefined" || !fixture) return;
    const url = getShareUrl(fixture.id, fixture.id);
    QRCode.toDataURL(url, { width: 120, margin: 1 }).then(setQrDataUrl);
  }, [fixture]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  if (!fixture) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        Match not found
      </div>
    );
  }

  const batters = aggregateBatterScores(balls);
  const bowlers = aggregateBowlerScores(balls);
  const striker = batters.find((b) => b.playerId === currentInnings?.strikerId);
  const bowler = bowlers.find((b) => b.playerId === currentInnings?.bowlerId) ?? bowlers[0];
  const score = currentInnings ?? { runs: 0, wickets: 0, overs: 0, balls: 0, runRate: 0, teamName: fixture.teamAName };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 text-white p-4 sm:p-8">
      <button
        type="button"
        onClick={toggleFullscreen}
        className="fixed top-4 right-4 p-3 rounded-xl bg-white/10 hover:bg-white/20 z-10"
      >
        <Maximize2 className="w-5 h-5" />
      </button>

      <div className="text-center py-2 mb-4 border-b border-white/10">
        <p className="text-sm tracking-[0.5em] uppercase opacity-60">
          Cisco Champions Premier League 2026
        </p>
        {live.isLive && (
          <span className="inline-block mt-2 live-badge text-xs">LIVE</span>
        )}
      </div>

      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <p className="text-lg opacity-70 uppercase tracking-widest">
            {fixture.matchId} · {fixture.stage.replace(/_/g, " ")}
          </p>
          <h1 className="text-3xl sm:text-5xl font-black mt-2">
            {fixture.teamAName} <span className="text-accent">vs</span> {fixture.teamBName}
          </h1>
        </div>

        <motion.div
          className="text-center py-12 rounded-3xl bg-white/5 backdrop-blur border border-white/10 mb-8"
          layout
        >
          <p className="text-xl opacity-70 mb-2">{score.teamName}</p>
          <AnimatePresence mode="wait">
            <motion.div
              key={`${score.runs}-${score.wickets}`}
              initial={{ scale: 1.05, opacity: 0.8 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-8xl sm:text-[10rem] font-black tabular-nums leading-none"
            >
              {score.runs}/{score.wickets}
            </motion.div>
          </AnimatePresence>
          <p className="text-2xl opacity-80 mt-4">
            ({formatOvers(score.overs, score.balls)} ov)
          </p>
          <p className="text-lg opacity-60 mt-2">
            CRR: {currentInnings?.runRate.toFixed(2) ?? "0.00"}
            {match.target && ` · Target ${match.target}`}
            {currentInnings?.requiredRunRate != null &&
              ` · RRR ${currentInnings.requiredRunRate.toFixed(2)}`}
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/5 rounded-2xl p-6 text-center">
            <p className="text-sm opacity-60 uppercase">Partnership</p>
            <p className="text-3xl font-black mt-2">
              {currentInnings?.partnership
                ? `${currentInnings.partnership.runs} (${currentInnings.partnership.balls})`
                : "—"}
            </p>
          </div>
          <div className="bg-white/5 rounded-2xl p-6 text-center">
            <p className="text-sm opacity-60 uppercase">Striker</p>
            <p className="text-xl font-bold mt-2">
              {striker
                ? `${striker.playerName} ${striker.runs} (${striker.balls})`
                : "—"}
            </p>
          </div>
          <div className="bg-white/5 rounded-2xl p-6 text-center">
            <p className="text-sm opacity-60 uppercase">Bowler</p>
            <p className="text-xl font-bold mt-2">
              {bowler
                ? `${bowler.playerName} ${Math.floor(bowler.balls / 6)}.${bowler.balls % 6}-${bowler.runs}-${bowler.wickets}`
                : "—"}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <BallTimeline balls={lastSixBalls} max={6} size="lg" />
          {qrDataUrl && (
            <div className="text-center">
              <img src={qrDataUrl} alt="Live score QR" className="mx-auto rounded-xl" />
              <p className="text-xs opacity-60 mt-2">Scan for live score</p>
            </div>
          )}
        </div>

        <div className="mt-12 text-center py-4 border-t border-white/10">
          <p className="text-2xl font-black text-primary">CISCO</p>
          <p className="text-sm opacity-50">CCPL 2026 Scoring Pro</p>
        </div>
      </div>
    </div>
  );
}
