"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  Trophy,
  Radio,
  TrendingUp,
  Users,
  Calendar,
  Megaphone,
  Cloud,
  Share2,
} from "lucide-react";
import { CountdownTimer } from "@/components/dashboard/countdown-timer";
import { FixtureList } from "@/components/dashboard/fixture-card";
import { PointsTable } from "@/components/dashboard/points-table";
import {
  useAnnouncements,
  useFixtures,
  usePointsTable,
  useSettings,
  useTeams,
  useTournamentCountdown,
} from "@/hooks/use-tournament-data";

export default function HomePage() {
  const { data: countdown } = useTournamentCountdown();
  const { data: settings } = useSettings();
  const { data: teams = [] } = useTeams();
  const { data: fixtures = [], isLoading: fixturesLoading } = useFixtures();
  const { data: pointsTable = [] } = usePointsTable();
  const { data: announcements = [] } = useAnnouncements();

  const today = new Date().toISOString().split("T")[0];
  const todayFixtures = fixtures.filter((f) => f.date === today);
  const upcoming = fixtures.filter((f) => f.status === "scheduled").slice(0, 6);
  const live = fixtures.filter((f) => f.status === "live");
  const completed = fixtures.filter((f) => f.status === "completed").slice(0, 4);

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="gradient-hero text-white py-12 sm:py-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <p className="text-sm uppercase tracking-[0.3em] opacity-80 mb-2">Cisco Champions Premier League</p>
            <h1 className="text-4xl sm:text-6xl font-black mb-2">CCPL 2026</h1>
            <p className="text-lg opacity-90 mb-8">Scoring Pro — Enterprise Live Cricket Platform</p>
          </motion.div>

          {countdown && (
            <CountdownTimer
              days={countdown.days}
              hours={countdown.hours}
              minutes={countdown.minutes}
              seconds={countdown.seconds}
              started={countdown.started}
            />
          )}

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/ccpl" className="px-6 py-3 rounded-xl bg-white/20 backdrop-blur font-semibold hover:bg-white/30">
              CCPL Hub
            </Link>
            <Link href="/fixtures" className="px-6 py-3 rounded-xl bg-white text-primary font-semibold hover:brightness-110">
              View Fixtures
            </Link>
            <Link href="/standings" className="px-6 py-3 rounded-xl border border-white/40 font-semibold hover:bg-white/10">
              Standings
            </Link>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-10 space-y-12">
        {/* Live matches */}
        {live.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Radio className="w-5 h-5 text-red-500 animate-pulse" />
              <h2 className="text-2xl font-bold">Live Now</h2>
            </div>
            <FixtureList fixtures={live} title="" />
          </section>
        )}

        {/* Stats strip */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {[
            { icon: Calendar, label: "Fixtures", value: fixtures.length },
            { icon: Users, label: "Teams", value: teams.filter((t) => t.playerIds.length > 0).length },
            { icon: Trophy, label: "Stages", value: 5 },
            { icon: TrendingUp, label: "Matches", value: completed.length + live.length },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="glass-card p-4 text-center">
              <Icon className="w-6 h-6 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-black">{value}</p>
              <p className="text-xs text-slate-500">{label}</p>
            </div>
          ))}
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-6 lg:gap-8">
          <div className="md:col-span-2 xl:col-span-8 space-y-8">
            {todayFixtures.length > 0 && (
              <FixtureList fixtures={todayFixtures} title="Today's Fixtures" />
            )}
            <FixtureList fixtures={upcoming} title="Upcoming Fixtures" />
            {completed.length > 0 && (
              <FixtureList fixtures={completed} title="Recent Results" />
            )}
          </div>

          <div className="md:col-span-2 xl:col-span-4 space-y-6">
            <div>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-accent" /> Points Table
              </h2>
              <PointsTable entries={pointsTable.slice(0, 8)} compact />
            </div>

            <div className="glass-card p-4">
              <h3 className="font-bold mb-3 flex items-center gap-2">
                <Megaphone className="w-4 h-4" /> Announcements
              </h3>
              <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2 md:block md:overflow-visible md:space-y-3">
                {announcements.slice(0, 3).map((a) => (
                  <div
                    key={a.id}
                    className="snap-start shrink-0 w-[85vw] max-w-sm md:w-auto border border-slate-200/10 rounded-xl p-3 md:border-0 md:rounded-none md:p-0 md:border-b md:border-slate-200/10 md:pb-3 last:border-0"
                  >
                    <p className="font-medium text-sm">{a.title}</p>
                    <p className="text-xs text-slate-500 mt-1">{a.body}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card p-4 gradient-hero text-white">
              <Cloud className="w-8 h-8 mb-2 opacity-80" />
              <p className="font-bold">Weather</p>
              <p className="text-sm opacity-90">{settings?.venue || "Bengaluru"} · Partly cloudy · 28°C</p>
            </div>

            <div className="glass-card p-4 text-center">
              <Share2 className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p className="font-bold text-sm">Share Live Scores</p>
              <p className="text-xs text-slate-500 mt-1">Scan QR at venue or share match links</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
