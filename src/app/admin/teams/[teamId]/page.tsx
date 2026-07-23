"use client";

import Link from "next/link";
import { use, useState } from "react";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getFirebaseAuth } from "@/lib/firebase/config";
import { PageContainer, PageHeader } from "@/components/layout/page-container";
import { usePlayers, useTeams } from "@/hooks/use-tournament-data";
import { DEMO_DATA } from "@/lib/seed";

async function getAdminAuthHeader(): Promise<HeadersInit> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("Sign in as admin to manage rosters");
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

export default function AdminTeamRosterPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = use(params);
  const queryClient = useQueryClient();
  const { data: teams = [] } = useTeams();
  const { data: players = [], isLoading } = usePlayers(teamId);
  const team = teams.find((entry) => entry.id === teamId) || DEMO_DATA.teams.find((entry) => entry.id === teamId);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  if (!team) {
    return (
      <PageContainer>
        <p className="text-slate-500 py-20 text-center">Team not found.</p>
      </PageContainer>
    );
  }

  const refreshRoster = async () => {
    await queryClient.invalidateQueries({ queryKey: ["players", teamId] });
    await queryClient.invalidateQueries({ queryKey: ["players"] });
    await queryClient.invalidateQueries({ queryKey: ["player"] });
    await queryClient.invalidateQueries({ queryKey: ["teams"] });
  };

  const handleAdd = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setError("");

    try {
      const headers = await getAdminAuthHeader();
      const res = await fetch(`/api/admin/teams/${teamId}/players`, {
        method: "POST",
        headers,
        body: JSON.stringify({ name, email: email.trim() || null }),
      });
      const data = (await res.json()) as { success?: boolean; message?: string };
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to add player");
      }

      setName("");
      setEmail("");
      setMessage(data.message || "Player added");
      await refreshRoster();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add player");
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (playerId: string, playerName: string) => {
    if (!window.confirm(`Remove ${playerName} from ${team.name}?`)) return;

    setBusy(true);
    setMessage("");
    setError("");

    try {
      const headers = await getAdminAuthHeader();
      const res = await fetch(`/api/admin/teams/${teamId}/players/${playerId}`, {
        method: "DELETE",
        headers,
      });
      const data = (await res.json()) as { success?: boolean; message?: string };
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to remove player");
      }

      setMessage(`${playerName} removed`);
      await refreshRoster();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove player");
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageContainer size="md">
      <Link
        href="/admin/teams"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-primary mb-6 min-h-[44px]"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Teams
      </Link>

      <PageHeader
        title={team.name}
        subtitle={`Manage roster · ${players.length} players`}
      />

      {message && (
        <div className="mb-4 p-4 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
          {message}
        </div>
      )}
      {error && (
        <div className="mb-4 p-4 rounded-xl bg-red-500/10 text-red-600 border border-red-500/20" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={(event) => void handleAdd(event)} className="glass-card p-6 mb-8 space-y-4">
        <h2 className="font-bold flex items-center gap-2">
          <Plus className="w-5 h-5 text-primary" /> Add Player
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm text-slate-500">Player name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              disabled={busy}
              className="mt-1 w-full rounded-xl border border-slate-200/20 bg-transparent px-4 py-3"
              placeholder="Gyanendra Patro"
            />
          </label>
          <label className="block">
            <span className="text-sm text-slate-500">Email (optional)</span>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={busy}
              type="email"
              className="mt-1 w-full rounded-xl border border-slate-200/20 bg-transparent px-4 py-3"
              placeholder="name@cisco.com"
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={busy || !name.trim()}
          className="px-5 py-3 rounded-xl bg-primary text-white font-semibold disabled:opacity-60"
        >
          Add to roster
        </button>
      </form>

      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-slate-200/10 font-bold">Current roster</div>
        {isLoading ? (
          <p className="p-6 text-slate-500">Loading roster…</p>
        ) : (
          <ul className="divide-y divide-slate-200/10">
            {players.map((player, index) => (
              <li key={player.id} className="p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium">
                    {index + 1}. {player.name}
                    {player.isCaptain && <span className="ml-2 text-xs text-accent">(C)</span>}
                  </p>
                  {player.email && <p className="text-sm text-slate-500">{player.email}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => void handleRemove(player.id, player.name)}
                  disabled={busy || player.isCaptain}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-red-600 hover:bg-red-500/10 disabled:opacity-40"
                  title={player.isCaptain ? "Cannot remove captain" : "Remove player"}
                >
                  <Trash2 className="w-4 h-4" />
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PageContainer>
  );
}
