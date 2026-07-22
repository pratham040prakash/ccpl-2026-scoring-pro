"use client";

import { PointsTable } from "@/components/dashboard/points-table";
import { usePointsTable } from "@/hooks/use-tournament-data";
import { exportToCSV, generatePointsTablePDF } from "@/lib/export/reports";
import { Download, FileText } from "lucide-react";

export default function StandingsPage() {
  const { data: pointsTable = [], isLoading } = usePointsTable();

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black">Points Table</h1>
          <p className="text-slate-500">Auto-ranked · Top 8 qualify for knockouts</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => generatePointsTablePDF(pointsTable)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg glass-card text-sm font-medium hover:border-primary/40"
          >
            <FileText className="w-4 h-4" /> PDF
          </button>
          <button
            onClick={() => exportToCSV(pointsTable as unknown as Record<string, unknown>[], "ccpl-points-table.csv")}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium"
          >
            <Download className="w-4 h-4" /> CSV
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="skeleton h-96 rounded-xl" />
      ) : (
        <PointsTable entries={pointsTable} />
      )}
    </div>
  );
}
