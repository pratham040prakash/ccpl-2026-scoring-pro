"use client";

import { PointsTable } from "@/components/dashboard/points-table";
import { PageContainer, PageHeader } from "@/components/layout/page-container";
import { usePointsTable } from "@/hooks/use-tournament-data";
import { exportToCSV, generatePointsTablePDF } from "@/lib/export/reports";
import { Download, FileText } from "lucide-react";

export default function StandingsPage() {
  const { data: pointsTable = [], isLoading } = usePointsTable();

  return (
    <PageContainer size="md">
      <PageHeader
        title="Points Table"
        subtitle="Auto-ranked · Top 8 qualify for knockouts"
        actions={
          <>
            <button
              type="button"
              onClick={() => generatePointsTablePDF(pointsTable)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl glass-card text-sm font-medium hover:border-primary/40 min-h-[44px]"
            >
              <FileText className="w-4 h-4" /> PDF
            </button>
            <button
              type="button"
              onClick={() => exportToCSV(pointsTable as unknown as Record<string, unknown>[], "ccpl-points-table.csv")}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium min-h-[44px]"
            >
              <Download className="w-4 h-4" /> CSV
            </button>
          </>
        }
      />

      {isLoading ? (
        <div className="skeleton h-96 rounded-xl" />
      ) : (
        <PointsTable entries={pointsTable} />
      )}
    </PageContainer>
  );
}
