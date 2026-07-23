"use client";

import Link from "next/link";
import { notFound } from "next/navigation";
import { use } from "react";
import { ArrowLeft } from "lucide-react";
import { DEMO_DATA } from "@/lib/seed";
import { generatePlayerInsight } from "@/lib/engine/ai";
import { usePlayer, useTeams } from "@/hooks/use-tournament-data";

export default function PlayerPage({
  params,
}: {
  params: Promise<{ playerId: string }>;
}) {
  const { playerId } = use(params);
  const { data: player, isLoading } = usePlayer(playerId);
  const { data: teams = [] } = useTeams();
  const team =
    (player ? teams.find((entry) => entry.id === player.teamId) : null) ||
    (player ? DEMO_DATA.teams.find((entry) => entry.id === player.teamId) : null);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <p className="text-slate-500 py-20 text-center">Loading player…</p>
      </div>
    );
  }

  if (!player) notFound();

  const insight = generatePlayerInsight(
    player.name,
    player.stats.runs,
    player.stats.balls,
    player.stats.wickets,
    player.stats.matches
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <Link href={`/teams/${player.teamId}`} className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-primary mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to {team?.name}
      </Link>

      <div className="glass-card p-8 mb-8">
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 rounded-full gradient-hero flex items-center justify-center text-white text-3xl font-black">
            {player.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-3xl font-black">{player.name}</h1>
            <p className="text-slate-500">{team?.name}</p>
            <p className="text-sm capitalize mt-1">
              {player.role.replace("_", " ")} · {player.battingStyle.replace("_", " ")} bat
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Runs", value: player.stats.runs },
          { label: "Balls", value: player.stats.balls },
          { label: "Strike Rate", value: player.stats.strikeRate || "-" },
          { label: "Wickets", value: player.stats.wickets },
          { label: "Economy", value: player.stats.economy || "-" },
          { label: "4s", value: player.stats.fours },
          { label: "6s", value: player.stats.sixes },
          { label: "MVP Pts", value: player.stats.mvpPoints },
        ].map(({ label, value }) => (
          <div key={label} className="glass-card p-4 text-center">
            <p className="text-2xl font-black text-primary">{value}</p>
            <p className="text-xs text-slate-500">{label}</p>
          </div>
        ))}
      </div>

      <div className="glass-card p-6">
        <h2 className="font-bold mb-3">AI Player Insights</h2>
        <p className="text-slate-600 dark:text-slate-400">{insight}</p>
      </div>
    </div>
  );
}
