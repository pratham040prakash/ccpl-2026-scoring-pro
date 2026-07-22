"use client";

import Link from "next/link";
import { notFound } from "next/navigation";
import { use } from "react";
import { ArrowLeft, Trophy } from "lucide-react";
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
    <div className="max-w-5xl mx-auto px-4 py-10">
      <Link href="/teams" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-primary mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Teams
      </Link>

      <div className="glass-card p-8 mb-8">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-2xl gradient-hero flex items-center justify-center text-white font-black text-2xl">
            {team.shortName}
          </div>
          <div>
            <h1 className="text-3xl font-black">{team.name}</h1>
            {captain && <p className="text-slate-500 mt-1">Captain: {captain.name}</p>}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mt-8">
          {[
            { label: "Played", value: team.stats.played },
            { label: "Won", value: team.stats.won },
            { label: "Points", value: team.stats.points },
            { label: "NRR", value: team.stats.nrr.toFixed(3) },
          ].map(({ label, value }) => (
            <div key={label} className="text-center p-3 rounded-xl bg-slate-100/5">
              <p className="text-2xl font-black text-primary">{value}</p>
              <p className="text-xs text-slate-500">{label}</p>
            </div>
          ))}
        </div>
      </div>

      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <Trophy className="w-5 h-5" /> Squad ({players.length})
      </h2>
      <div className="glass-card overflow-hidden">
        <table className="w-full text-sm">
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
    </div>
  );
}
