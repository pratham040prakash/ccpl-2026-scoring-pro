"use client";

import { useMemo, useState } from "react";
import { FixtureList } from "@/components/dashboard/fixture-card";
import { useFixtures } from "@/hooks/use-tournament-data";

const STAGES = [
  { id: "all", label: "All" },
  { id: "round_1", label: "Round 1" },
  { id: "integration", label: "Round 2" },
  { id: "quarter_final", label: "Quarter-Finals" },
  { id: "semi_final", label: "Semi-Finals" },
  { id: "final", label: "Final" },
];

export default function FixturesPage() {
  const { data: fixtures = [], isLoading } = useFixtures();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return fixtures.filter((f) => {
      const matchStage = filter === "all" || f.stage === filter;
      const matchSearch =
        !search ||
        f.teamAName.toLowerCase().includes(search.toLowerCase()) ||
        f.teamBName.toLowerCase().includes(search.toLowerCase()) ||
        f.matchId.toLowerCase().includes(search.toLowerCase());
      return matchStage && matchSearch;
    });
  }, [fixtures, filter, search]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-black mb-2">Fixtures</h1>
      <p className="text-slate-500 mb-8">
        CCPL 2026 final schedule — 18 matches · Mon 27 → Thu 30 Jul 2026
      </p>

      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <input
          type="search"
          placeholder="Search teams or match ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-3 rounded-xl glass-card border border-slate-200/20 bg-transparent"
        />
        <div className="flex gap-2 flex-wrap">
          {STAGES.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setFilter(id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filter === id ? "bg-primary text-white" : "glass-card hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton h-48 rounded-xl" />
          ))}
        </div>
      ) : (
        <FixtureList fixtures={filtered} title={`${filtered.length} Matches`} />
      )}
    </div>
  );
}
