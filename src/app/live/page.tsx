"use client";

import Link from "next/link";
import { Radio } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/layout/page-container";
import { FixtureList } from "@/components/dashboard/fixture-card";
import { useFixtures } from "@/hooks/use-tournament-data";

export default function LiveMatchesPage() {
  const { data: fixtures = [], isLoading } = useFixtures();
  const live = fixtures.filter((f) => f.status === "live");
  const scheduled = fixtures.filter((f) => f.status === "scheduled").slice(0, 6);

  return (
    <PageContainer>
      <PageHeader
        title="Live Matches"
        subtitle="Follow ball-by-ball scores in real time"
        badge={
          live.length > 0 ? (
            <span className="live-badge mb-2">{live.length} LIVE</span>
          ) : undefined
        }
      />

      {isLoading ? (
        <div className="glass-card p-12 text-center text-slate-500">Loading…</div>
      ) : live.length > 0 ? (
        <FixtureList fixtures={live} title="" />
      ) : (
        <div className="glass-card p-10 text-center mb-8">
          <Radio className="w-12 h-12 mx-auto text-slate-400 mb-4" />
          <p className="text-lg font-bold mb-2">No live matches right now</p>
          <p className="text-sm text-slate-500 mb-6">Check upcoming fixtures or start scoring from Admin</p>
          <Link href="/admin/matches" className="inline-flex px-6 py-3 rounded-xl bg-primary text-white font-semibold min-h-[48px] items-center">
            Match Control
          </Link>
        </div>
      )}

      {scheduled.length > 0 && (
        <div className="mt-10">
          <FixtureList fixtures={scheduled} title="Up Next" />
        </div>
      )}
    </PageContainer>
  );
}
