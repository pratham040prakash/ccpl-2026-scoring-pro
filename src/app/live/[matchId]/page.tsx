"use client";

import { use } from "react";
import Link from "next/link";
import { Radio } from "lucide-react";
import { ProfessionalScorecard } from "@/components/scorecard/professional-scorecard";
import { useProfessionalScorecard } from "@/hooks/use-professional-scorecard";
import { useLiveNotifications } from "@/hooks/use-live-notifications";

export default function LiveMatchPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = use(params);
  const data = useProfessionalScorecard(matchId);

  useLiveNotifications(data.match?.id ?? matchId);

  if (data.loading && !data.fixture && data.innings.length === 0) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 text-center text-slate-500">
        Loading match…
      </div>
    );
  }

  if (!data.fixture) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 text-center">
        <p className="text-slate-500">Match not found</p>
        <Link href="/fixtures" className="text-primary mt-4 inline-block">
          View Fixtures
        </Link>
      </div>
    );
  }

  if (data.mode === "pending" && !data.hasDetailedScorecard) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="glass-card p-10 text-center">
          <Radio className="w-10 h-10 mx-auto text-slate-400 mb-4" />
          <p className="text-slate-500">Match has not started yet</p>
          <p className="text-sm text-slate-400 mt-2">
            Live scorecard will update automatically ball by ball once scoring begins
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 sm:py-10">
      <ProfessionalScorecard data={data} />
    </div>
  );
}
