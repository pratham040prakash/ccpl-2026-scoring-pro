"use client";

import { exportToCSV, exportToExcel, generatePointsTablePDF } from "@/lib/export/reports";
import { usePointsTable, useTeams } from "@/hooks/use-tournament-data";
import { DEMO_DATA } from "@/lib/seed";
import { Download, FileText, Table } from "lucide-react";

export default function ReportsPage() {
  const { data: pointsTable = [] } = usePointsTable();
  const { data: teams = [] } = useTeams();

  const teamExport = teams.map((t) => ({
    Team: t.name,
    Played: t.stats.played,
    Won: t.stats.won,
    Lost: t.stats.lost,
    Points: t.stats.points,
    NRR: t.stats.nrr.toFixed(3),
    Players: t.playerIds.length,
  }));

  const playerExport = DEMO_DATA.players.map((p) => ({
    Name: p.name,
    Team: teams.find((t) => t.id === p.teamId)?.name || "",
    Runs: p.stats.runs,
    Wickets: p.stats.wickets,
    StrikeRate: p.stats.strikeRate,
    Economy: p.stats.economy,
  }));

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-black mb-2">Export Center</h1>
      <p className="text-slate-500 mb-8">PDF, CSV, and Excel reports</p>

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
            action: () => exportToExcel(playerExport as unknown as Record<string, unknown>[], "ccpl-players.xlsx", "Players"),
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
              exportToCSV(
                DEMO_DATA.fixtures.map((f) => ({
                  MatchID: f.matchId,
                  Date: f.date,
                  TeamA: f.teamAName,
                  TeamB: f.teamBName,
                  Stage: f.stage,
                  Overs: f.overs,
                })) as unknown as Record<string, unknown>[],
                "ccpl-fixtures.csv"
              ),
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
