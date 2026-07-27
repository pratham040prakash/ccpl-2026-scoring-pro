"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClipboardList, PenLine, Radio, Smartphone, Tv } from "lucide-react";
import type { Fixture } from "@/types";
import { useLiveMatch } from "@/hooks/use-live-match";
import { useAuth } from "@/providers/auth-provider";
import { canStartLiveScoring } from "@/lib/live/match-start";
import { isMatchSetupComplete } from "@/lib/live/match-setup";
import { cn } from "@/lib/utils";

type Props = {
  fixture: Fixture;
  compact?: boolean;
};

export function MatchScoringActions({
  fixture,
  compact = false,
}: Props) {
  const router = useRouter();
  const { user, profile, retryAdminBootstrap } = useAuth();
  const live = useLiveMatch(fixture.id);
  const [startError, setStartError] = useState<string | null>(null);
  const [retryingRole, setRetryingRole] = useState(false);
  const [roleFixMessage, setRoleFixMessage] = useState<string | null>(null);

  const isLive =
    live.isLive ||
    live.innings.length > 0 ||
    isMatchSetupComplete(live.match) ||
    fixture.status === "live";
  const startGate = canStartLiveScoring(fixture);
  const canScore = profile?.role === "administrator" || profile?.role === "scorer";
  const isViewer = profile?.role === "viewer";

  const permissionError = [startError, live.error]
    .filter(Boolean)
    .some((msg) => msg!.toLowerCase().includes("permission"));

  const handleRetryRole = async () => {
    setRetryingRole(true);
    setRoleFixMessage(null);
    const err = await retryAdminBootstrap();
    setRoleFixMessage(err ?? "Administrator access refreshed. Try Start Match again.");
    setRetryingRole(false);
  };

  const handleStart = () => {
    if (!startGate.ok) {
      setStartError(startGate.reason);
      return;
    }
    router.push(`/admin/matches/${fixture.id}/setup`);
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
          <p className="text-red-500 text-xs whitespace-pre-wrap">{startError || live.error}</p>
        )}
      </div>

      {permissionError && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm space-y-2">
          <p className="font-semibold text-red-600 dark:text-red-400">Firestore permissions fix</p>
          {profile?.role === "administrator" || profile?.role === "scorer" ? (
            <p className="text-slate-600 dark:text-slate-300">
              Your Firestore user already has role <strong>{profile.role}</strong>. The app is
              still blocked — usually Firestore rules are not deployed, or the live site uses a
              different Firebase project than the console you edited.
            </p>
          ) : (
            <p className="text-slate-600 dark:text-slate-300">
              Set Firestore <strong>users / your uid / role</strong> to{" "}
              <strong>administrator</strong>, then sign out and back in.
            </p>
          )}
          <ul className="list-disc list-inside text-slate-600 dark:text-slate-300 space-y-1">
            <li>
              Signed in as <strong>{profile?.email || "unknown"}</strong>
              {user?.uid ? (
                <>
                  {" "}
                  · uid <code className="text-xs">{user.uid}</code>
                </>
              ) : null}
            </li>
            <li>
              Firebase project:{" "}
              <code className="text-xs">
                {process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "not set"}
              </code>{" "}
              — must match Firebase Console project id
            </li>
            <li>
              Deploy rules: <code className="text-xs">npm run firebase:deploy:rules</code> (or
              Firebase Console → Firestore → Rules → Publish)
            </li>
          </ul>
          <button
            type="button"
            onClick={handleRetryRole}
            disabled={retryingRole}
            className="text-sm font-semibold text-primary underline disabled:opacity-50"
          >
            {retryingRole ? "Retrying…" : "Retry admin access grant"}
          </button>
          {roleFixMessage && <p className="text-xs text-slate-500">{roleFixMessage}</p>}
        </div>
      )}

      {!isLive && (
        <div className="space-y-2">
          {!startGate.ok && (
            <p className="text-amber-600 text-sm">{startGate.reason}</p>
          )}
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
            disabled={!canScore || !startGate.ok}
            className={cn(
              actionClass,
              "bg-emerald-600 text-white hover:brightness-110 disabled:opacity-50 w-full sm:w-auto"
            )}
          >
            <ClipboardList className="w-4 h-4" />
            Match Setup Wizard
          </button>
          <p className="text-xs text-slate-500">
            Toss, playing XI, and openers — batting/bowling teams are set automatically from the
            toss.
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
