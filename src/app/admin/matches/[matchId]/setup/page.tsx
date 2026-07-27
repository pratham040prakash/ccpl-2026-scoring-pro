"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { MatchSetupWizard } from "@/components/match-setup/match-setup-wizard";
import { useAuth } from "@/providers/auth-provider";
import { useLiveMatch } from "@/hooks/use-live-match";
import { initializeLiveMatch } from "@/lib/engine/live-scoring-service";
import { canStartLiveScoring, formatLiveStartError } from "@/lib/live/match-start";
import { hasLiveScoringStarted } from "@/lib/live/match-setup";
import type { MatchSetupInput } from "@/types/match-setup";

export default function MatchSetupPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = use(params);
  const router = useRouter();
  const { profile, loading: authLoading } = useAuth();
  const live = useLiveMatch(matchId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canScore =
    profile?.role === "administrator" || profile?.role === "scorer";

  const shouldRedirect = useMemo(
    () =>
      hasLiveScoringStarted(live.innings) ||
      live.match?.status === "completed" ||
      live.match?.locked === true,
    [live.innings, live.match?.status, live.match?.locked]
  );

  useEffect(() => {
    if (authLoading || live.loading || !shouldRedirect) return;
    router.replace(`/admin/matches/${matchId}/score`);
  }, [authLoading, live.loading, shouldRedirect, matchId, router]);

  const fixture = live.fixture;
  const startGate = fixture ? canStartLiveScoring(fixture) : { ok: false as const, reason: "Match not found" };

  const handleComplete = async (input: MatchSetupInput) => {
    if (!fixture || !startGate.ok) {
      setError(startGate.ok ? "Match not found" : startGate.reason);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await initializeLiveMatch(fixture, input);
      router.push(`/admin/matches/${matchId}/score`);
    } catch (err) {
      setError(formatLiveStartError(err));
    } finally {
      setBusy(false);
    }
  };

  if (authLoading || live.loading) {
    return <div className="p-10 text-center text-slate-500">Loading…</div>;
  }

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

  if (!fixture) {
    return (
      <div className="max-w-lg mx-auto p-10 text-center">
        <p className="text-slate-500">Match not found</p>
        <Link href="/admin/matches" className="text-primary mt-4 inline-block">
          Back to matches
        </Link>
      </div>
    );
  }

  if (shouldRedirect) {
    return <div className="p-10 text-center text-slate-500">Redirecting to scorer…</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link
        href="/admin/matches"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-primary mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Match Control
      </Link>

      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-wider text-primary">Match Setup</p>
        <h1 className="text-3xl font-black mt-1">
          {fixture.teamAName} vs {fixture.teamBName}
        </h1>
        <p className="text-slate-500 mt-1">
          {fixture.matchId} · Complete setup in under 30 seconds
        </p>
      </div>

      {!startGate.ok && (
        <div className="glass-card p-4 mb-6 border border-amber-500/30 text-amber-700 text-sm">
          {startGate.reason}
        </div>
      )}

      {error && (
        <div className="glass-card p-4 mb-6 border border-red-500/30 text-red-600 text-sm whitespace-pre-wrap">
          {error}
        </div>
      )}

      {!hasLiveScoringStarted(live.innings) && live.innings.length > 0 && (
        <div className="glass-card p-4 mb-6 border border-primary/30 text-primary text-sm">
          Updating setup will replace the current toss and opening players (no balls scored yet).
        </div>
      )}

      <MatchSetupWizard
        fixture={fixture}
        existingMatch={live.match}
        onComplete={handleComplete}
        busy={busy || !startGate.ok}
      />
    </div>
  );
}
