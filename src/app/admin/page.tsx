"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Shield,
  Users,
  Calendar,
  Play,
  Database,
  Upload,
  FileSpreadsheet,
  Lock,
  Trophy,
} from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { useFixtures, useTeams } from "@/hooks/use-tournament-data";
import { useMatchResults } from "@/providers/match-results-provider";
import { ScoreUpdatePanel } from "@/components/admin/score-update-panel";

export default function AdminPage() {
  const { profile, hasRole, signInWithGoogle, isDemo } = useAuth();
  const { data: teams = [] } = useTeams();
  const { data: fixtures = [] } = useFixtures();
  const { scores } = useMatchResults();
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState("");

  if (!profile) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <Shield className="w-16 h-16 mx-auto text-primary mb-4" />
        <h1 className="text-2xl font-bold mb-2">Admin Access Required</h1>
        <p className="text-slate-500 mb-6">Sign in with Google to access the admin panel</p>
        <button
          onClick={() => signInWithGoogle()}
          className="px-6 py-3 rounded-xl bg-primary text-white font-semibold"
        >
          Sign in with Google
        </button>
      </div>
    );
  }

  if (!hasRole("administrator", "scorer")) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <Lock className="w-16 h-16 mx-auto text-amber-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Insufficient Permissions</h1>
        <p className="text-slate-500">Your role ({profile.role}) does not have admin access. Contact an administrator.</p>
      </div>
    );
  }

  const handleSeed = async () => {
    setSeeding(true);
    setSeedResult("");
    try {
      const res = await fetch("/api/seed", { method: "POST" });
      const data = await res.json();
      setSeedResult(data.message || "Seed completed");
    } catch {
      setSeedResult(isDemo ? "Demo mode: data loaded from local seed" : "Seed failed — check Firebase config");
    }
    setSeeding(false);
  };

  const adminSections = [
    {
      title: "Teams",
      icon: Users,
      items: [
        { label: "Manage Teams", href: "/admin/teams", count: teams.length },
        { label: "Import Players CSV", href: "/admin/import" },
      ],
    },
    {
      title: "Scores & Results",
      icon: Trophy,
      items: [
        { label: "Update Scores (CSV / Photo / Manual)", href: "/admin/scores", count: Object.keys(scores).length },
      ],
    },
    {
      title: "Fixtures & Matches",
      icon: Calendar,
      items: [
        { label: "View Fixtures", href: "/fixtures", count: fixtures.length },
        { label: "Start Match", href: "/admin/matches" },
      ],
    },
    {
      title: "Database",
      icon: Database,
      items: [
        { label: "Seed Database", action: handleSeed },
        { label: "Backup", href: "/admin/backup" },
      ],
    },
    {
      title: "Reports",
      icon: FileSpreadsheet,
      items: [{ label: "Export Center", href: "/reports" }],
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black">Admin Panel</h1>
          <p className="text-slate-500">
            Welcome, {profile.displayName} · {profile.role}
            {isDemo && " · Demo Mode"}
          </p>
        </div>
        <Link
          href="/admin/matches/new"
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-primary text-white font-semibold hover:brightness-110"
        >
          <Play className="w-5 h-5" /> Start Match
        </Link>
      </div>

      {seedResult && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
          {seedResult}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {adminSections.map(({ title, icon: Icon, items }) => (
          <div key={title} className="glass-card p-6">
            <h2 className="font-bold flex items-center gap-2 mb-4">
              <Icon className="w-5 h-5 text-primary" /> {title}
            </h2>
            <div className="space-y-2">
              {items.map((item) =>
                "action" in item ? (
                  <button
                    key={item.label}
                    onClick={item.action}
                    disabled={seeding}
                    className="w-full text-left px-4 py-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between disabled:opacity-50"
                  >
                    {item.label}
                    {seeding && item.label === "Seed Database" && "..."}
                  </button>
                ) : (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="block px-4 py-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between"
                  >
                    {item.label}
                    {"count" in item && item.count !== undefined && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                        {item.count}
                      </span>
                    )}
                  </Link>
                )
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <ScoreUpdatePanel />
      </div>

      <div className="mt-8 glass-card p-6">
        <h2 className="font-bold flex items-center gap-2 mb-4">
          <Upload className="w-5 h-5" /> Quick Actions
        </h2>
        <div className="grid sm:grid-cols-3 gap-3">
          <button className="p-4 rounded-xl border border-slate-200/20 hover:border-primary/40 text-sm font-medium">
            Upload Team Logo
          </button>
          <button className="p-4 rounded-xl border border-slate-200/20 hover:border-primary/40 text-sm font-medium">
            Publish Standings
          </button>
          <button className="p-4 rounded-xl border border-slate-200/20 hover:border-primary/40 text-sm font-medium">
            Lock Completed Matches
          </button>
        </div>
      </div>
    </div>
  );
}
