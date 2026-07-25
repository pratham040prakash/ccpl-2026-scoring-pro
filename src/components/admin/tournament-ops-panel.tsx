"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/providers/auth-provider";
import { useFixtures, usePointsTable, useTeams } from "@/hooks/use-tournament-data";
import { useLeaderboards } from "@/hooks/use-leaderboards";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import { CONFIRM } from "@/lib/live/operator-confirm";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

interface ValidationCheck {
  name: string;
  pass: boolean;
  detail: string;
}

export function TournamentOpsPanel() {
  const { user, profile } = useAuth();
  const { data: fixtures = [] } = useFixtures();
  const { data: teams = [] } = useTeams();
  const { data: pointsTable = [] } = usePointsTable();
  const { boards, source: leaderboardSource } = useLeaderboards();
  const [validating, setValidating] = useState(false);
  const [serverChecks, setServerChecks] = useState<ValidationCheck[]>([]);
  const [validateScore, setValidateScore] = useState<number | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const stats = useMemo(() => {
    const live = fixtures.filter((f) => f.status === "live").length;
    const completed = fixtures.filter((f) =>
      ["completed", "locked", "published"].includes(f.status)
    ).length;
    const todayFixtures = fixtures.filter((f) => f.date === today);
    const next = fixtures.find(
      (f) => f.status === "scheduled" && f.teamAId && f.teamBId
    );
    return {
      live,
      completed,
      remaining: fixtures.length - completed,
      today: todayFixtures.length,
      progress: fixtures.length ? Math.round((completed / fixtures.length) * 100) : 0,
      next,
    };
  }, [fixtures, today]);

  const checklist = useMemo(
    () => [
      { label: "Firebase Connected", pass: isFirebaseConfigured() },
      { label: "Admin Logged In", pass: profile?.role === "administrator" || profile?.role === "scorer" },
      { label: "Teams Loaded", pass: teams.length >= 16 },
      { label: "Fixtures Loaded", pass: fixtures.length >= 18 },
      { label: "Live Scoring Ready", pass: isFirebaseConfigured() && teams.length > 0 },
      { label: "Standings Ready", pass: pointsTable.length > 0 || stats.completed === 0 },
      { label: "Leaderboards Ready", pass: leaderboardSource === "firestore" || stats.completed === 0 },
      { label: "Reports Ready", pass: teams.length > 0 && pointsTable.length >= 0 },
    ],
    [profile, teams, fixtures, pointsTable, leaderboardSource, stats.completed]
  );

  const runValidation = useCallback(async () => {
    setValidating(true);
    try {
      const token = user ? await user.getIdToken() : null;
      const res = await fetch("/api/admin/validate", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = (await res.json()) as {
        checks?: ValidationCheck[];
        score?: number;
      };
      setServerChecks(data.checks ?? []);
      setValidateScore(data.score ?? null);
    } catch {
      setServerChecks([{ name: "Validation API", pass: false, detail: "Request failed" }]);
      setValidateScore(0);
    } finally {
      setValidating(false);
    }
  }, [user]);

  useEffect(() => {
    void runValidation();
  }, [runValidation]);

  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-xl font-black">Tournament operations</h2>
          <button
            type="button"
            onClick={() => void runValidation()}
            disabled={validating}
            className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold disabled:opacity-50"
          >
            {validating ? "Validating…" : "Run pre-tournament validation"}
          </button>
        </div>

        {validateScore !== null && (
          <p className="text-sm mb-4">
            Infrastructure score:{" "}
            <strong className={validateScore >= 80 ? "text-emerald-500" : "text-amber-500"}>
              {validateScore}/100
            </strong>
          </p>
        )}

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <Metric label="Matches today" value={stats.today} />
          <Metric label="Live now" value={stats.live} />
          <Metric label="Completed" value={stats.completed} />
          <Metric label="Remaining" value={stats.remaining} />
          <Metric label="Progress" value={`${stats.progress}%`} />
          <Metric label="Teams" value={teams.length} />
          <Metric label="Fixtures" value={fixtures.length} />
          <Metric
            label="Next match"
            value={stats.next?.matchId ?? "—"}
          />
        </div>

        {stats.next && (
          <p className="text-sm text-slate-500 mb-4">
            Next: {stats.next.teamAName} vs {stats.next.teamBName} · {stats.next.startTime}
          </p>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <h3 className="font-bold mb-3">Tournament day checklist</h3>
          <ul className="space-y-2 text-sm">
            {checklist.map(({ label, pass }) => (
              <li key={label} className="flex items-center gap-2">
                {pass ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-amber-500 shrink-0" />
                )}
                {label}
              </li>
            ))}
          </ul>
        </div>

        <div className="glass-card p-6">
          <h3 className="font-bold mb-3">Infrastructure validation</h3>
          {validating && (
            <p className="text-sm text-slate-500 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Running checks…
            </p>
          )}
          <ul className="space-y-2 text-sm">
            {serverChecks.map((check) => (
              <li key={check.name} className="flex items-start gap-2">
                {check.pass ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                )}
                <span>
                  <strong>{check.name}</strong>
                  <span className="block text-slate-500 text-xs">{check.detail}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-slate-500/10 px-3 py-2">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-lg font-bold tabular-nums">{value}</div>
    </div>
  );
}

// exported for seed confirm reuse
export { CONFIRM };