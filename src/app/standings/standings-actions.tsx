"use client";

import type { PointsTableEntry } from "@/types";
import { exportToCSV, generatePointsTablePDF } from "@/lib/export/reports";
import { Download, FileText } from "lucide-react";

export function StandingsActions({ pointsTable }: { pointsTable: PointsTableEntry[] }) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => generatePointsTablePDF(pointsTable)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg glass-card text-sm font-medium hover:border-primary/40"
      >
        <FileText className="w-4 h-4" /> PDF
      </button>
      <button
        type="button"
        onClick={() =>
          exportToCSV(pointsTable as unknown as Record<string, unknown>[], "ccpl-points-table.csv")
        }
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium"
      >
        <Download className="w-4 h-4" /> CSV
      </button>
    </div>
  );
}
