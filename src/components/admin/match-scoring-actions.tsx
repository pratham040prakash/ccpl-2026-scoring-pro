"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PenLine, Play, Radio, Smartphone, Tv } from "lucide-react";
import type { Fixture } from "@/types";
import { useLiveMatch } from "@/hooks/use-live-match";
import { useAuth } from "@/providers/auth-provider";
import { initializeLiveMatch } from "@/lib/engine/live-scoring-service";
import { cn } from "@/lib/utils";

type Props = {
  fixture: Fixture;
  /** Navigate to the admin scorer after a successful start. */
  openScorerAfterStart?: boolean;
  compact?: boolean;
};

export function MatchScoringActions({
  fixture,
  openScorerAfterStart = true,
  compact = false,
}: Props) {
  const router = useRouter();
  const { profile } = useAuth();
  const live = useLiveMatch(fixture.id);
  const [busy, setBusy] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [startedLocally, setStartedLocally] = useState(false);

  const isLive =
    live.isLive ||
    live.innings.length > 0 ||
    startedLocally ||
    fixture.status === "live";
  const canScore = profile?.role === "administrator" || profile?.role === "scorer";
  const isViewer = profile?.role === "viewer";

  const handleStart = async () => {
    setBusy(true);
    setStartError(null);
    try {
      await initializeLiveMatch(fixture);
      setStartedLocally(true);
      live.refresh();
      if (openScorerAfterStart) {
        router.push(`/admin/matches/${fixture.id}/score`);
      }
    } catch (error) {
      setStartError(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  const actionClass = compact
    ? "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
    : "inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span
          className={cn(
            "px-2 py-0.5 rounded-full text-xs font-semibold uppercase",
            isLive
              ? "bg-emerald-500/15 text-emerald-600"
              : "bg-amber-500/15 text-amber-700 dark:text-amber-400"
          )}
        >
          {isLive ? "Live — ready to score" : "Not started"}
        </span>
        {(startError || live.error) && (
          <span className="text-red-500 text-xs">{startError || live.error}</span>
        )}
      </div>

      {!isLive && (
        <div className="space-y-2">
          {isViewer && (
            <p className="text-amber-600 text-sm">
              Your account has viewer access only. Ask an admin to grant scorer or administrator role.
            </p>
          )}
          {!canScore && !isViewer && (
            <p className="text-amber-600 text-sm">Sign in with a scorer or administrator account.</p>
          )}
          <button
            type="button"
            onClick={handleStart}
            disabled={busy || !canScore}
            className={cn(
              actionClass,
              "bg-emerald-600 text-white hover:brightness-110 disabled:opacity-50 w-full sm:w-auto"
            )}
          >
            <Play className="w-4 h-4" />
            {busy ? "Starting…" : "Start Match & Open Scorer"}
          </button>
          <p className="text-xs text-slate-500">
            Starts the match in Firestore, then opens the live scoring panel.
          </p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
        <Link
          href={`/admin/matches/${fixture.id}/score`}
          className={cn(
            actionClass,
            isLive
              ? "bg-emerald-600 text-white hover:brightness-110"
              : "border border-slate-200/30 text-slate-500 pointer-events-none opacity-50"
          )}
          aria-disabled={!isLive}
          tabIndex={isLive ? 0 : -1}
        >
          <PenLine className="w-4 h-4" />
          Open Live Scorer
        </Link>

        {isLive ? (
          <Link
            href={`/match/${fixture.id}/score/mobile`}
            className={cn(actionClass, "bg-accent text-white hover:brightness-110")}
          >
            <Smartphone className="w-4 h-4" />
            Mobile Scorer
          </Link>
        ) : (
          <span
            className={cn(
              actionClass,
              "bg-slate-400/30 text-slate-500 cursor-not-allowed"
            )}
            title="Start the match first"
          >
            <Smartphone className="w-4 h-4" />
            Mobile Scorer
          </span>
        )}

        <Link
          href={`/live/${fixture.id}`}
          className={cn(actionClass, "border border-slate-200/30 hover:border-primary/40")}
        >
          <Radio className="w-4 h-4" />
          Public Live
        </Link>
        <Link
          href={`/match/${fixture.id}/tv`}
          className={cn(actionClass, "border border-slate-200/30 hover:border-primary/40")}
        >
          <Tv className="w-4 h-4" />
          TV Mode
        </Link>
      </div>
    </div>
  );
}
