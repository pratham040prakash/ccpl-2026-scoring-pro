"use client";

import type { BatterScore, BowlerScore, Innings, Match } from "@/types";
import {
  generateScorecardPDF,
  exportScorecardCSV,
  exportScorecardExcel,
} from "@/lib/export/reports";
import { getShareUrl } from "@/lib/utils";
import { Download, FileSpreadsheet, Printer, Share2 } from "lucide-react";

interface ScorecardExportBarProps {
  match: Match;
  fixtureId: string;
  innings: Innings[];
  batters: BatterScore[];
  bowlers: BowlerScore[];
}

export function ScorecardExportBar({
  match,
  fixtureId,
  innings,
  batters,
  bowlers,
}: ScorecardExportBarProps) {
  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/match/${fixtureId}/scorecard`
      : getShareUrl(fixtureId, fixtureId);

  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <ExportButton
        icon={Download}
        label="PDF"
        onClick={() => generateScorecardPDF(match, innings, batters, bowlers)}
      />
      <ExportButton
        icon={FileSpreadsheet}
        label="Excel"
        onClick={() => exportScorecardExcel(match, innings, batters, bowlers)}
      />
      <ExportButton
        icon={FileSpreadsheet}
        label="CSV"
        onClick={() => exportScorecardCSV(match, innings, batters, bowlers)}
      />
      <ExportButton icon={Printer} label="Print" onClick={() => window.print()} />
      <ExportButton
        icon={Share2}
        label="Share"
        onClick={() =>
          navigator.share?.({
            title: `${match.teamAName} vs ${match.teamBName} — Scorecard`,
            url: shareUrl,
          })
        }
      />
    </div>
  );
}

function ExportButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-medium hover:border-primary/40 transition-colors"
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}
