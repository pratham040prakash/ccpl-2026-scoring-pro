"use client";

import { use, useEffect, useState } from "react";
import QRCode from "qrcode";
import { motion, AnimatePresence } from "framer-motion";
import { Maximize2 } from "lucide-react";
import { useFixtures } from "@/hooks/use-tournament-data";
import { formatOvers, getShareUrl } from "@/lib/utils";

export default function TVScoreboardPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = use(params);
  const { data: fixtures = [] } = useFixtures();
  const fixture = fixtures.find((f) => f.id === matchId);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [fullscreen, setFullscreen] = useState(false);

  // Demo live score state
  const [score, setScore] = useState({ runs: 42, wickets: 2, overs: 3, balls: 4 });

  useEffect(() => {
    if (typeof window === "undefined" || !fixture) return;
    const url = getShareUrl(fixture.id, fixture.id);
    QRCode.toDataURL(url, { width: 120, margin: 1 }).then(setQrDataUrl);
  }, [fixture]);

  useEffect(() => {
    const interval = setInterval(() => {
      setScore((s) => ({
        ...s,
        runs: s.runs + Math.floor(Math.random() * 3),
      }));
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  if (!fixture) {
    return <div className="min-h-screen bg-black text-white flex items-center justify-center">Match not found</div>;
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setFullscreen(true);
    } else {
      document.exitFullscreen();
      setFullscreen(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 text-white p-4 sm:p-8">
      <button
        onClick={toggleFullscreen}
        className="fixed top-4 right-4 p-3 rounded-xl bg-white/10 hover:bg-white/20 z-10"
      >
        <Maximize2 className="w-5 h-5" />
      </button>

      {/* Sponsor banner */}
      <div className="text-center py-2 mb-4 border-b border-white/10">
        <p className="text-sm tracking-[0.5em] uppercase opacity-60">Cisco Champions Premier League 2026</p>
      </div>

      <div className="max-w-6xl mx-auto">
        {/* Match header */}
        <div className="text-center mb-8">
          <p className="text-lg opacity-70 uppercase tracking-widest">{fixture.matchId} · {fixture.stage.replace(/_/g, " ")}</p>
          <h1 className="text-3xl sm:text-5xl font-black mt-2">
            {fixture.teamAName} <span className="text-accent">vs</span> {fixture.teamBName}
          </h1>
        </div>

        {/* Main score */}
        <motion.div
          className="text-center py-12 rounded-3xl bg-white/5 backdrop-blur border border-white/10 mb-8"
          layout
        >
          <p className="text-xl opacity-70 mb-2">{fixture.teamAName}</p>
          <AnimatePresence mode="wait">
            <motion.div
              key={score.runs}
              initial={{ scale: 1.1, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-8xl sm:text-[10rem] font-black tabular-nums leading-none"
            >
              {score.runs}/{score.wickets}
            </motion.div>
          </AnimatePresence>
          <p className="text-2xl opacity-80 mt-4">
            ({formatOvers(score.overs, score.balls)} ov)
          </p>
          <p className="text-lg opacity-60 mt-2">CRR: {((score.runs / (score.overs * 6 + score.balls)) * 6).toFixed(2)}</p>
        </motion.div>

        <div className="grid sm:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/5 rounded-2xl p-6 text-center">
            <p className="text-sm opacity-60 uppercase">Partnership</p>
            <p className="text-3xl font-black mt-2">28 (18)</p>
          </div>
          <div className="bg-white/5 rounded-2xl p-6 text-center">
            <p className="text-sm opacity-60 uppercase">Striker</p>
            <p className="text-xl font-bold mt-2">Player A 24 (14)</p>
          </div>
          <div className="bg-white/5 rounded-2xl p-6 text-center">
            <p className="text-sm opacity-60 uppercase">Bowler</p>
            <p className="text-xl font-bold mt-2">Player B 1-18-2</p>
          </div>
        </div>

        {/* Last balls + QR */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex gap-3">
            {[1, 4, 0, 6, 2, "W"].map((b, i) => (
              <div
                key={i}
                className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-black ${
                  b === "W" ? "bg-red-500" : b === 4 ? "bg-blue-500" : b === 6 ? "bg-purple-500" : "bg-white/20"
                }`}
              >
                {b}
              </div>
            ))}
          </div>
          {qrDataUrl && (
            <div className="text-center">
              <img src={qrDataUrl} alt="Live score QR" className="mx-auto rounded-xl" />
              <p className="text-xs opacity-60 mt-2">Scan for live score</p>
            </div>
          )}
        </div>

        {/* Sponsor footer */}
        <div className="mt-12 text-center py-4 border-t border-white/10">
          <p className="text-2xl font-black text-primary">CISCO</p>
          <p className="text-sm opacity-50">CCPL 2026 Scoring Pro</p>
        </div>
      </div>
    </div>
  );
}
