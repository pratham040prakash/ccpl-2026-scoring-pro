"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { ScoreUpdatePanel } from "@/components/admin/score-update-panel";
import { SignInPanel } from "@/components/auth/sign-in-panel";

export default function AdminScoresPage() {
  const { profile, hasRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center text-slate-500">
        Checking sign-in status…
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <p className="text-slate-500 mb-4">Sign in to update scores</p>
        <SignInPanel submitLabel="Sign in" showGoogleOption={false} />
      </div>
    );
  }

  if (!hasRole("administrator", "scorer")) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center text-slate-500">
        Scorer or administrator access required.
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-primary mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Admin
      </Link>
      <h1 className="text-3xl font-black mb-2">Update Scores</h1>
      <p className="text-slate-500 mb-8">CSV import, scorecard photo, or manual entry</p>
      <ScoreUpdatePanel />
    </div>
  );
}
