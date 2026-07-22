"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, Tv, Radio } from "lucide-react";
import { AdminLiveScorer } from "@/components/scorer/admin-live-scorer";
import { useAuth } from "@/providers/auth-provider";

export default function AdminMatchScorePage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = use(params);
  const { profile, loading } = useAuth();

  if (loading) {
    return <div className="p-10 text-center text-slate-500">Loading…</div>;
  }

  const canScore =
    profile?.role === "administrator" || profile?.role === "scorer";

  if (!canScore) {
    return (
      <div className="max-w-lg mx-auto p-10 text-center">
        <p className="text-red-500 font-bold mb-4">Scorer access required</p>
        <Link href="/admin/matches" className="text-primary">
          Back to matches
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <Link
          href="/admin/matches"
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-primary"
        >
          <ArrowLeft className="w-4 h-4" /> Match Control
        </Link>
        <div className="flex gap-2">
          <Link
            href={`/live/${matchId}`}
            className="flex items-center gap-2 px-3 py-2 rounded-lg glass-card text-sm"
          >
            <Radio className="w-4 h-4" /> Public Live
          </Link>
          <Link
            href={`/match/${matchId}/tv`}
            className="flex items-center gap-2 px-3 py-2 rounded-lg glass-card text-sm"
          >
            <Tv className="w-4 h-4" /> TV Mode
          </Link>
        </div>
      </div>

      <h1 className="text-2xl font-black mb-6">Live Scoring Panel</h1>
      <AdminLiveScorer matchId={matchId} />
    </div>
  );
}
