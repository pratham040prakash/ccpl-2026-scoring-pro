"use client";

import { use } from "react";
import Link from "next/link";
import { AdminLiveScorer } from "@/components/scorer/admin-live-scorer";
import { useAuth } from "@/providers/auth-provider";

export default function MobileScorerPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = use(params);
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        Loading…
      </div>
    );
  }

  const canScore = profile?.role === "administrator" || profile?.role === "scorer";

  if (!canScore) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center gap-4">
        <p className="text-red-400 font-bold">Scorer access required</p>
        <Link href={`/live/${matchId}`} className="text-accent text-sm">
          Back to live view
        </Link>
      </div>
    );
  }

  return <AdminLiveScorer matchId={matchId} layout="mobile" />;
}
