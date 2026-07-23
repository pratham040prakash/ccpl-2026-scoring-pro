"use client";

import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/layout/page-container";
import { useTeams } from "@/hooks/use-tournament-data";

export default function AdminTeamsPage() {
  const { data: teams = [], isLoading } = useTeams();

  return (
    <PageContainer>
      <Link
        href="/admin"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-primary mb-6 min-h-[44px]"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Admin
      </Link>

      <PageHeader
        title="Manage Teams"
        subtitle="Add or remove players from tournament rosters"
      />

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
    </PageContainer>
  );
}
