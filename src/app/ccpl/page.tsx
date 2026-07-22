"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  MapPin,
  BookOpen,
  Users,
  Shield,
  Phone,
  ExternalLink,
  Tv,
  Smartphone,
} from "lucide-react";
import { CountdownTimer } from "@/components/dashboard/countdown-timer";
import { useSettings, useTournamentCountdown } from "@/hooks/use-tournament-data";

export default function CCPLPage() {
  const { data: settings } = useSettings();
  const { data: countdown } = useTournamentCountdown();

  return (
    <div className="min-h-screen">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero opacity-90" />
        <div className="relative max-w-7xl mx-auto px-4 py-16 sm:py-24 text-white text-center">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            <div className="w-24 h-24 mx-auto rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-3xl font-black mb-6">
              CCPL
            </div>
            <p className="text-sm uppercase tracking-[0.4em] opacity-80">Powered by Cisco</p>
            <h1 className="text-4xl sm:text-5xl font-black mt-2">Cisco Champions Premier League</h1>
            <p className="text-xl mt-2 opacity-90">2026 Edition</p>
          </motion.div>

          {countdown && (
            <div className="mt-10">
              <CountdownTimer {...countdown} />
            </div>
          )}
        </div>
      </section>

      {/* Sponsor carousel */}
      <section className="py-6 border-b border-slate-200/10 overflow-hidden">
        <div className="flex gap-8 animate-marquee justify-center flex-wrap px-4">
          {(settings?.sponsors || []).map((s) => (
            <div key={s.name} className="glass-card px-8 py-4 font-bold text-primary shrink-0">
              {s.name}
            </div>
          ))}
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-12 grid md:grid-cols-2 gap-8">
        {/* Venue */}
        <div className="glass-card p-6">
          <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
            <MapPin className="w-5 h-5 text-primary" /> Venue
          </h2>
          <p className="font-medium">{settings?.venue}</p>
          <p className="text-sm text-slate-500 mt-2">Jul 27–30, 2026 · 9:00 AM – 3:00 PM IST</p>
          {settings?.venueMapUrl && (
            <a
              href={settings.venueMapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 text-primary text-sm font-medium hover:underline"
            >
              Open in Google Maps <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>

        {/* Rules */}
        <div className="glass-card p-6">
          <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
            <BookOpen className="w-5 h-5 text-primary" /> Tournament Rules
          </h2>
          <ul className="space-y-2 text-sm">
            {(settings?.rules || []).map((rule, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-primary font-bold">{i + 1}.</span>
                {rule}
              </li>
            ))}
          </ul>
        </div>

        {/* Officials */}
        <div className="glass-card p-6">
          <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-primary" /> Match Officials
          </h2>
          <div className="space-y-3">
            {(settings?.officials || []).map((o) => (
              <div key={o.name} className="flex justify-between text-sm">
                <span className="font-medium">{o.name}</span>
                <span className="text-slate-500">{o.role}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Volunteers */}
        <div className="glass-card p-6">
          <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-primary" /> Volunteers
          </h2>
          <div className="space-y-3">
            {(settings?.volunteers || []).map((v) => (
              <div key={v.name} className="flex justify-between text-sm">
                <span className="font-medium">{v.name}</span>
                <span className="text-slate-500">{v.role}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Emergency */}
        <div className="glass-card p-6 md:col-span-2 border-red-500/20">
          <h2 className="text-xl font-bold flex items-center gap-2 mb-4 text-red-500">
            <Phone className="w-5 h-5" /> Emergency Contacts
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {(settings?.emergencyContacts || []).map((c) => (
              <div key={c.name} className="flex justify-between p-3 rounded-lg bg-red-500/5">
                <span className="font-medium">{c.name}</span>
                <a href={`tel:${c.phone}`} className="text-primary font-mono">{c.phone}</a>
              </div>
            ))}
          </div>
        </div>

        {/* Quick links */}
        <div className="md:col-span-2 grid sm:grid-cols-2 gap-4">
          <Link href="/fixtures" className="glass-card p-6 hover:border-primary/40 transition-colors flex items-center gap-4">
            <Tv className="w-10 h-10 text-primary" />
            <div>
              <p className="font-bold">TV Scoreboard Mode</p>
              <p className="text-sm text-slate-500">Fullscreen LED display for projectors</p>
            </div>
          </Link>
          <Link href="/admin" className="glass-card p-6 hover:border-primary/40 transition-colors flex items-center gap-4">
            <Smartphone className="w-10 h-10 text-accent" />
            <div>
              <p className="font-bold">Mobile Scorer Mode</p>
              <p className="text-sm text-slate-500">One-handed offline scoring</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
