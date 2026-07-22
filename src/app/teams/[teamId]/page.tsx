"use client";

import Link from "next/link";
import { notFound } from "next/navigation";
import { use } from "react";
import { ArrowLeft, Trophy } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { DEMO_DATA } from "@/lib/seed";
import { useTeams } from "@/hooks/use-tournament-data";

export default function TeamDetailPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = use(params);
  const { data: teams = [] } = useTeams();
  const team = teams.find((t) => t.id === teamId) || DEMO_DATA.teams.find((t) => t.id === teamId);

  if (!team) notFound();

  const players = DEMO_DATA.players.filter((p) => p.teamId === team.id);
  const captain = players.find((p) => p.isCaptain);

  return (
    <PageContainer size="md">
      <Link href="/teams" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-primary mb-6 min-h-[44px]">
        <ArrowLeft className="w-4 h-4" /> Back to Teams
      </Link>

      <div className="glass-card p-6 sm:p-8 mb-8">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
          <div className="w-20 h-20 rounded-2xl gradient-hero flex items-center justify-center text-white font-black text-2xl shrink-0">
            {team.shortName}
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black">{team.name}</h1>
            {captain && <p className="text-slate-500 mt-1">Captain: {captain.name}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-8">
          {[
            { label: "Played", value: team.stats.played },
            { label: "Won", value: team.stats.won },
            { label: "Points", value: team.stats.points },
            { label: "NRR", value: team.stats.nrr.toFixed(3) },
          ].map(({ label, value }) => (
            <div key={label} className="text-center p-3 rounded-xl bg-slate-100/5">
              <p className="text-xl sm:text-2xl font-black text-primary">{value}</p>
              <p className="text-xs text-slate-500">{label}</p>
            </div>
          ))}
        </div>
      </div>

      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <Trophy className="w-5 h-5" /> Squad ({players.length})
      </h2>

      <div className="md:hidden space-y-2 mb-8">
        {players.map((p, i) => (
          <Link
            key={p.id}
            href={`/players/${p.id}`}
            className="glass-card p-4 flex items-center justify-between gap-3 min-h-[56px]"
          >
            <div className="min-w-0">
              <p className="font-semibold truncate">
                {i + 1}. {p.name}
                {p.isCaptain && <span className="ml-2 text-xs text-accent">(C)</span>}
              </p>
              <p className="text-xs text-slate-500 capitalize">{p.role.replace("_", " ")}</p>
            </div>
            <div className="text-right text-sm shrink-0">
              <p>{p.stats.runs} runs</p>
              <p className="text-slate-500">{p.stats.wickets} wkts</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="hidden md:block glass-card overflow-x-auto">
        <table className="w-full text-sm min-w-[480px]">
          <thead>
            <tr className="border-b border-slate-200/20 bg-primary/5">
              <th className="text-left p-3">#</th>
              <th className="text-left p-3">Player</th>
              <th className="text-left p-3">Role</th>
              <th className="text-right p-3">Runs</th>
              <th className="text-right p-3">Wkts</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p, i) => (
              <tr key={p.id} className="border-b border-slate-200/10 hover:bg-slate-50/5">
                <td className="p-3">{i + 1}</td>
                <td className="p-3">
                  <Link href={`/players/${p.id}`} className="font-medium hover:text-primary">
                    {p.name}
                    {p.isCaptain && <span className="ml-2 text-xs text-accent">(C)</span>}
                  </Link>
                </td>
                <td className="p-3 capitalize text-slate-500">{p.role.replace("_", " ")}</td>
                <td className="p-3 text-right">{p.stats.runs}</td>
                <td className="p-3 text-right">{p.stats.wickets}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageContainer>
  );
}
