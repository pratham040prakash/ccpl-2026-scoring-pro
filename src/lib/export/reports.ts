import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import type { BatterScore, BowlerScore, Innings, Match, PointsTableEntry } from "@/types";
import { formatDate } from "@/lib/utils";

export function generateScorecardPDF(
  match: Match,
  innings: Innings[],
  batters: BatterScore[],
  bowlers: BowlerScore[]
): void {
  const doc = new jsPDF();
  const title = `${match.teamAName} vs ${match.teamBName}`;

  doc.setFontSize(18);
  doc.text("CCPL 2026 Scoring Pro", 14, 20);
  doc.setFontSize(14);
  doc.text(title, 14, 30);
  doc.setFontSize(10);
  doc.text(`${formatDate(match.date)} · ${match.ground} · ${match.overs} overs`, 14, 38);

  if (match.result) {
    doc.text(`Result: ${match.result.winnerName} won by ${match.result.margin}`, 14, 46);
  }

  let y = 55;

  for (const inn of innings) {
    doc.setFontSize(12);
    doc.text(`${inn.teamName}: ${inn.runs}/${inn.wickets} (${inn.overs}.${inn.balls} ov)`, 14, y);
    y += 8;
  }

  doc.setFontSize(11);
  doc.text("Batting", 14, y + 5);
  autoTable(doc, {
    startY: y + 8,
    head: [["Batter", "R", "B", "4s", "6s", "SR"]],
    body: batters.map((b) => [
      b.playerName + (b.isOut ? "" : "*"),
      b.runs,
      b.balls,
      b.fours,
      b.sixes,
      b.strikeRate,
    ]),
    theme: "grid",
    headStyles: { fillColor: [0, 102, 204] },
  });

  const finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  doc.text("Bowling", 14, finalY + 10);
  autoTable(doc, {
    startY: finalY + 13,
    head: [["Bowler", "O", "R", "W", "Econ"]],
    body: bowlers.map((b) => [
      b.playerName,
      `${Math.floor(b.balls / 6)}.${b.balls % 6}`,
      b.runs,
      b.wickets,
      b.economy,
    ]),
    theme: "grid",
    headStyles: { fillColor: [0, 102, 204] },
  });

  doc.save(`${match.matchId}-scorecard.pdf`);
}

export function generatePointsTablePDF(entries: PointsTableEntry[]): void {
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text("CCPL 2026 — Points Table", 14, 20);

  autoTable(doc, {
    startY: 30,
    head: [["#", "Team", "P", "W", "L", "Pts", "NRR"]],
    body: entries.map((e) => [
      e.rank,
      e.teamName,
      e.played,
      e.won,
      e.lost,
      e.points,
      e.nrr.toFixed(3),
    ]),
    theme: "grid",
    headStyles: { fillColor: [0, 102, 204] },
  });

  doc.save("ccpl-2026-points-table.pdf");
}

export function exportToCSV<T extends Record<string, unknown>>(
  data: T[],
  filename: string
): void {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers.map((h) => {
      const val = row[h];
      const str = String(val ?? "");
      return str.includes(",") ? `"${str}"` : str;
    }).join(",")
  );
  const csv = [headers.join(","), ...rows].join("\n");
  downloadBlob(csv, filename, "text/csv");
}

export function exportToExcel<T extends Record<string, unknown>>(
  data: T[],
  filename: string,
  sheetName = "Sheet1"
): void {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, filename);
}

function downloadBlob(content: string, filename: string, type: string): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
