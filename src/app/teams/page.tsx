"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search, Users } from "lucide-react";
import { useTeams } from "@/hooks/use-tournament-data";
import { DEMO_DATA } from "@/lib/seed";
import teamsData from "@/data/teams.json";

export default function TeamsPage() {
  const { data: teams = [], isLoading } = useTeams();
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () =>
      teams.filter(
        (t) =>
          !search || t.name.toLowerCase().includes(search.toLowerCase())
      ),
    [teams, search]
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-black mb-2">Teams</h1>
      <p className="text-slate-500 mb-8">{teams.length} teams registered for CCPL 2026</p>

      <div className="relative mb-8 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="search"
          placeholder="Search teams..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-xl glass-card border border-slate-200/20 bg-transparent"
        />
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton h-40 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((team) => {
            const captain = DEMO_DATA.players.find((p) => p.id === team.captainId);
            const seedTeam = (teamsData as { name: string; status?: string; need?: string }[]).find(
              (t) => t.name === team.name
            );
            return (
              <Link
                key={team.id}
                href={`/teams/${team.id}`}
                className="glass-card p-5 hover:border-primary/30 transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-xl gradient-hero flex items-center justify-center text-white font-black text-lg shrink-0">
                    {team.shortName}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold group-hover:text-primary transition-colors truncate">
                      {team.name}
                    </h3>
                    {captain && (
                      <p className="text-sm text-slate-500 mt-1">Captain: {captain.name}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <Users className="w-3 h-3" />
                        {team.playerIds.length} players
                      </span>
                      {seedTeam?.status && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600">
                          {seedTeam.status}
                        </span>
                      )}
                      {seedTeam?.need && seedTeam.need !== "OK" && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600">
                          {seedTeam.need}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-3 mt-3 text-xs">
                      <span>P: {team.stats.played}</span>
                      <span className="text-emerald-500">W: {team.stats.won}</span>
                      <span className="text-red-400">L: {team.stats.lost}</span>
                      <span>Pts: {team.stats.points}</span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
