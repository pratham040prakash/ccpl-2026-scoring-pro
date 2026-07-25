"use client";

import { exportToCSV, exportToExcel, generatePointsTablePDF } from "@/lib/export/reports";
import { useFixtures, usePlayers, usePointsTable, useTeams } from "@/hooks/use-tournament-data";
import { useLeaderboards } from "@/hooks/use-leaderboards";
import { Download, FileText, Table } from "lucide-react";

export default function ReportsPage() {
  const { data: pointsTable = [], isLoading: pointsLoading } = usePointsTable();
  const { data: teams = [] } = useTeams();
  const { data: fixtures = [] } = useFixtures();
  const { data: players = [] } = usePlayers();
  const { boards, source: leaderboardSource } = useLeaderboards();

  const teamExport = teams.map((t) => {
    const row = pointsTable.find((p) => p.teamId === t.id);
    return {
      Team: t.name,
      Played: row?.played ?? t.stats.played,
      Won: row?.won ?? t.stats.won,
      Lost: row?.lost ?? t.stats.lost,
      Tied: row?.tied ?? 0,
      NR: row?.nr ?? 0,
      Points: row?.points ?? t.stats.points,
      NRR: (row?.nrr ?? t.stats.nrr).toFixed(3),
      Players: t.playerIds.length,
    };
  });

  const orangeCap = new Map((boards.orangeCap ?? []).map((e) => [e.playerId, e]));
  const purpleCap = new Map((boards.purpleCap ?? []).map((e) => [e.playerId, e]));
  const mostSixes = new Map((boards.mostSixes ?? []).map((e) => [e.playerId, e]));
  const bestEconomy = new Map((boards.bestEconomy ?? []).map((e) => [e.playerId, e]));

  const playerExport = players.map((p) => {
    const teamName = teams.find((t) => t.id === p.teamId)?.name ?? "";
    return {
      Name: p.name,
      Team: teamName,
      Runs: orangeCap.get(p.id)?.value ?? p.stats.runs,
      Wickets: purpleCap.get(p.id)?.value ?? p.stats.wickets,
      Sixes: mostSixes.get(p.id)?.value ?? p.stats.sixes,
      Economy: bestEconomy.get(p.id)?.value ?? p.stats.economy,
      StrikeRate: p.stats.strikeRate,
      Fours: p.stats.fours,
    };
  });

  const fixtureExport = fixtures.map((f) => ({
    MatchID: f.matchId,
    Date: f.date,
    TeamA: f.teamAName,
    TeamB: f.teamBName,
    Stage: f.stage,
    Overs: f.overs,
    Status: f.status,
  }));

  const dataSource =
    leaderboardSource === "firestore" ? "Live Firestore data" : "Partial — finalize matches for full stats";

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-black mb-2">Export Center</h1>
      <p className="text-slate-500 mb-2">PDF, CSV, and Excel reports from live tournament data.</p>
      <p className="text-xs text-slate-400 mb-8">Data source: {dataSource}</p>

      {pointsLoading && pointsTable.length === 0 && (
        <p className="text-sm text-amber-500 mb-4">Loading standings from Firestore…</p>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        {[
          {
            title: "Points Table PDF",
            icon: FileText,
            action: () => generatePointsTablePDF(pointsTable),
          },
          {
            title: "Points Table CSV",
            icon: Download,
            action: () => exportToCSV(pointsTable as unknown as Record<string, unknown>[], "ccpl-points.csv"),
          },
          {
            title: "Team Statistics Excel",
            icon: Table,
            action: () => exportToExcel(teamExport as unknown as Record<string, unknown>[], "ccpl-teams.xlsx", "Teams"),
          },
          {
            title: "Player Statistics Excel",
            icon: Table,
            action: () =>
              exportToExcel(playerExport as unknown as Record<string, unknown>[], "ccpl-players.xlsx", "Players"),
          },
          {
            title: "Player Statistics CSV",
            icon: Download,
            action: () => exportToCSV(playerExport as unknown as Record<string, unknown>[], "ccpl-players.csv"),
          },
          {
            title: "Fixtures CSV",
            icon: Download,
            action: () =>
              exportToCSV(fixtureExport as unknown as Record<string, unknown>[], "ccpl-fixtures.csv"),
          },
        ].map(({ title, icon: Icon, action }) => (
          <button
            key={title}
            onClick={action}
            className="glass-card p-6 text-left hover:border-primary/40 transition-colors flex items-center gap-4"
          >
            <Icon className="w-8 h-8 text-primary shrink-0" />
            <span className="font-semibold">{title}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
