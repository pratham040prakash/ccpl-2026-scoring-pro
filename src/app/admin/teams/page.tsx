"use client";

import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import { useTeams } from "@/hooks/use-tournament-data";

export default function AdminTeamsPage() {
  const { data: teams = [], isLoading } = useTeams();

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <Link
        href="/admin"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-primary mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Admin
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-black">Manage Teams</h1>
        <p className="text-slate-500 mt-1">Add or remove players from tournament rosters</p>
      </div>

      {isLoading ? (
        <p className="text-slate-500">Loading teams…</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {teams.map((team) => (
            <Link
              key={team.id}
              href={`/admin/teams/${team.id}`}
              className="glass-card p-5 hover:border-primary/40 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold">{team.name}</p>
                  <p className="text-sm text-slate-500 mt-1">{team.shortName}</p>
                </div>
                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full shrink-0">
                  {team.playerIds?.length ?? 0} players
                </span>
              </div>
              <p className="text-sm text-primary mt-4 inline-flex items-center gap-2">
                <Users className="w-4 h-4" /> Edit roster
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
