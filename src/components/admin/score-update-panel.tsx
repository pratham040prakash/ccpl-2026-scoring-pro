"use client";

import { useState } from "react";
import { Upload, FileSpreadsheet, ImageIcon, PenLine, Download, CheckCircle, AlertCircle } from "lucide-react";
import { useFixtures } from "@/hooks/use-tournament-data";
import { useMatchResults } from "@/providers/match-results-provider";
import {
  parseScoreCsv,
  SCORE_CSV_SIMPLE,
  SCORE_CSV_TEMPLATE,
} from "@/lib/scores/store";
import { parseScoreImageFile } from "@/lib/scores/image-parser";
import type { Fixture } from "@/types";
import type { ParsedScoreImage } from "@/types/scores";
import { cn } from "@/lib/utils";

type Tab = "csv" | "image" | "manual";

export function ScoreUpdatePanel() {
  const [tab, setTab] = useState<Tab>("manual");
  const { data: fixtures = [] } = useFixtures();
  const { scores, applyScore, applyBulkScores, removeScore } = useMatchResults();
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const tabs: { id: Tab; label: string; icon: typeof Upload }[] = [
    { id: "csv", label: "Upload CSV", icon: FileSpreadsheet },
    { id: "image", label: "Upload Score Pic", icon: ImageIcon },
    { id: "manual", label: "Manual Entry", icon: PenLine },
  ];

  return (
    <div className="glass-card p-6">
      <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
        <Upload className="w-5 h-5 text-primary" /> Score Updates
      </h2>
      <p className="text-sm text-slate-500 mb-6">
        Import scores from CSV or a scorecard photo, or enter results manually. Standings update automatically.
      </p>

      <div className="flex gap-2 flex-wrap mb-6">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => { setTab(id); setMessage(null); }}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              tab === id ? "bg-primary text-white" : "glass-card hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {message && (
        <div
          className={cn(
            "mb-4 p-3 rounded-lg text-sm flex items-start gap-2",
            message.type === "ok"
              ? "bg-emerald-500/10 text-emerald-700 border border-emerald-500/20"
              : "bg-red-500/10 text-red-700 border border-red-500/20"
          )}
        >
          {message.type === "ok" ? <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />}
          {message.text}
        </div>
      )}

      {tab === "csv" && (
        <CsvUploadTab
          fixtures={fixtures}
          onImport={(result) => setMessage(result)}
        />
      )}
      {tab === "image" && (
        <ImageUploadTab
          fixtures={fixtures}
          onApply={(fixture, row) => {
            applyScore(fixture, row, "image");
            setMessage({ type: "ok", text: `Score saved for ${fixture.matchId}` });
          }}
        />
      )}
      {tab === "manual" && (
        <ManualEntryTab
          fixtures={fixtures}
          onSave={(fixture, row) => {
            applyScore(fixture, row, "manual");
            setMessage({ type: "ok", text: `${fixture.matchId} updated — standings recalculated` });
          }}
        />
      )}

      {Object.keys(scores).length > 0 && (
        <div className="mt-8 border-t border-slate-200/20 pt-6">
          <h3 className="font-bold mb-3">Saved Results ({Object.keys(scores).length})</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {Object.values(scores).map((s) => (
              <div key={s.fixtureId} className="flex items-center justify-between p-3 rounded-lg bg-slate-100/5 text-sm">
                <div>
                  <span className="font-semibold text-primary">{s.matchId}</span>
                  {" · "}
                  {s.teamAName} {s.teamARuns}/{s.teamAWickets} vs {s.teamBName} {s.teamBRuns}/{s.teamBWickets}
                  <span className="text-emerald-600 ml-2">→ {s.winnerName} ({s.margin})</span>
                  <span className="text-xs text-slate-500 ml-2 uppercase">{s.source}</span>
                </div>
                <button
                  onClick={() => removeScore(s.fixtureId)}
                  className="text-xs text-red-500 hover:underline shrink-0 ml-2"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CsvUploadTab({
  fixtures,
  onImport,
}: {
  fixtures: Fixture[];
  onImport: (msg: { type: "ok" | "err"; text: string }) => void;
}) {
  const { applyBulkScores } = useMatchResults();
  const [preview, setPreview] = useState<ReturnType<typeof parseScoreCsv>>([]);
  const [fileName, setFileName] = useState("");

  const handleFile = async (file: File) => {
    const text = await file.text();
    setFileName(file.name);
    setPreview(parseScoreCsv(text, fixtures));
  };

  const handleApply = () => {
    const { applied, errors } = applyBulkScores(preview, fixtures);
    if (applied === 0) {
      onImport({ type: "err", text: errors.join("; ") || "No valid rows to import" });
    } else {
      onImport({
        type: errors.length ? "err" : "ok",
        text: `Applied ${applied} match(es)${errors.length ? `. Skipped: ${errors.join("; ")}` : ""}`,
      });
      setPreview([]);
      setFileName("");
    }
  };

  const downloadTemplate = (content: string, name: string) => {
    const blob = new Blob([content], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => downloadTemplate(SCORE_CSV_TEMPLATE, "ccpl-score-template.csv")}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm glass-card hover:border-primary/40"
        >
          <Download className="w-4 h-4" /> Full template
        </button>
        <button
          onClick={() => downloadTemplate(SCORE_CSV_SIMPLE, "ccpl-score-simple.csv")}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm glass-card hover:border-primary/40"
        >
          <Download className="w-4 h-4" /> Simple (45/2 format)
        </button>
      </div>

      <label className="block border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors">
        <FileSpreadsheet className="w-10 h-10 mx-auto mb-2 text-primary" />
        <p className="font-medium">Drop CSV or click to upload</p>
        <p className="text-xs text-slate-500 mt-1">Columns: Match_ID, scores, Winner, Margin</p>
        <input
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
      </label>

      {fileName && <p className="text-sm text-slate-500">File: {fileName}</p>}

      {preview.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-lg border border-slate-200/20">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-primary/5">
                  <th className="p-2 text-left">Match</th>
                  <th className="p-2">Score A</th>
                  <th className="p-2">Score B</th>
                  <th className="p-2 text-left">Winner</th>
                  <th className="p-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((row) => (
                  <tr key={row.matchId} className="border-t border-slate-200/10">
                    <td className="p-2 font-medium">{row.matchId}</td>
                    <td className="p-2 text-center">{row.teamARuns}/{row.teamAWickets}</td>
                    <td className="p-2 text-center">{row.teamBRuns}/{row.teamBWickets}</td>
                    <td className="p-2">{row.winnerName || "—"}</td>
                    <td className="p-2">
                      {row.errors.length ? (
                        <span className="text-red-500 text-xs">{row.errors.join(", ")}</span>
                      ) : (
                        <span className="text-emerald-600 text-xs">Ready</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            onClick={handleApply}
            className="px-6 py-3 rounded-xl bg-primary text-white font-semibold hover:brightness-110"
          >
            Apply {preview.filter((r) => !r.errors.length).length} Scores
          </button>
        </>
      )}
    </div>
  );
}

function ImageUploadTab({
  fixtures,
  onApply,
}: {
  fixtures: Fixture[];
  onApply: (fixture: Fixture, row: Omit<import("@/types/scores").ScoreImportRow, "matchId" | "errors">) => void;
}) {
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<ParsedScoreImage | null>(null);
  const [fixtureId, setFixtureId] = useState("");
  const [form, setForm] = useState({
    teamARuns: 0,
    teamAWickets: 0,
    teamBRuns: 0,
    teamBWickets: 0,
    winnerName: "",
    margin: "",
  });

  const handleImage = async (file: File) => {
    setParsing(true);
    try {
      const result = await parseScoreImageFile(file);
      setParsed(result);
      const fixture = fixtures.find(
        (f) => f.matchId.toUpperCase() === (result.detectedMatchId || "").toUpperCase()
      );
      if (fixture) setFixtureId(fixture.id);
      setForm({
        teamARuns: result.teamAScore?.runs ?? 0,
        teamAWickets: result.teamAScore?.wickets ?? 0,
        teamBRuns: result.teamBScore?.runs ?? 0,
        teamBWickets: result.teamBScore?.wickets ?? 0,
        winnerName: "",
        margin: "",
      });
    } catch {
      setParsed({ rawText: "Could not read image. Try a clearer photo or use CSV.", confidence: "low" });
    }
    setParsing(false);
  };

  const selected = fixtures.find((f) => f.id === fixtureId);

  return (
    <div className="space-y-4">
      <label className="block border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-8 text-center cursor-pointer hover:border-primary/50">
        <ImageIcon className="w-10 h-10 mx-auto mb-2 text-accent" />
        <p className="font-medium">{parsing ? "Reading scorecard…" : "Upload scorecard photo"}</p>
        <p className="text-xs text-slate-500 mt-1">PNG, JPG — app extracts scores via OCR</p>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          disabled={parsing}
          onChange={(e) => e.target.files?.[0] && handleImage(e.target.files[0])}
        />
      </label>

      {parsed && (
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-slate-100/5 text-xs font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">
            {parsed.rawText.slice(0, 500)}
          </div>
          <p className="text-sm">
            Detected:{" "}
            {parsed.teamAScore ? `${parsed.teamAScore.runs}/${parsed.teamAScore.wickets}` : "—"} vs{" "}
            {parsed.teamBScore ? `${parsed.teamBScore.runs}/${parsed.teamBScore.wickets}` : "—"}
            {parsed.detectedMatchId && ` · Match ${parsed.detectedMatchId}`}
            <span className="ml-2 text-slate-500">({parsed.confidence} confidence)</span>
          </p>

          <select
            value={fixtureId}
            onChange={(e) => setFixtureId(e.target.value)}
            className="w-full px-4 py-3 rounded-xl glass-card border border-slate-200/20 bg-transparent"
          >
            <option value="">Select match to apply…</option>
            {fixtures.map((f) => (
              <option key={f.id} value={f.id}>
                {f.matchId} — {f.teamAName} vs {f.teamBName}
              </option>
            ))}
          </select>

          <div className="grid grid-cols-2 gap-3">
            <ScoreInput label={`${selected?.teamAName || "Team A"} runs`} value={form.teamARuns} onChange={(v) => setForm({ ...form, teamARuns: v })} />
            <ScoreInput label="Wickets" value={form.teamAWickets} onChange={(v) => setForm({ ...form, teamAWickets: v })} />
            <ScoreInput label={`${selected?.teamBName || "Team B"} runs`} value={form.teamBRuns} onChange={(v) => setForm({ ...form, teamBRuns: v })} />
            <ScoreInput label="Wickets" value={form.teamBWickets} onChange={(v) => setForm({ ...form, teamBWickets: v })} />
          </div>
          <input
            placeholder="Winner team name"
            value={form.winnerName}
            onChange={(e) => setForm({ ...form, winnerName: e.target.value })}
            className="w-full px-4 py-3 rounded-xl glass-card border border-slate-200/20 bg-transparent"
          />
          <input
            placeholder="Margin (e.g. 7 runs, 3 wickets)"
            value={form.margin}
            onChange={(e) => setForm({ ...form, margin: e.target.value })}
            className="w-full px-4 py-3 rounded-xl glass-card border border-slate-200/20 bg-transparent"
          />
          <button
            disabled={!selected}
            onClick={() =>
              selected &&
              onApply(selected, {
                ...form,
                teamAOvers: selected.overs,
                teamABalls: 0,
                teamBOvers: selected.overs,
                teamBBalls: 0,
              })
            }
            className="px-6 py-3 rounded-xl bg-primary text-white font-semibold disabled:opacity-50"
          >
            Confirm & Save Score
          </button>
        </div>
      )}
    </div>
  );
}

function ManualEntryTab({
  fixtures,
  onSave,
}: {
  fixtures: Fixture[];
  onSave: (fixture: Fixture, row: Omit<import("@/types/scores").ScoreImportRow, "matchId" | "errors">) => void;
}) {
  const [fixtureId, setFixtureId] = useState("");
  const [form, setForm] = useState({
    teamARuns: 0,
    teamAWickets: 0,
    teamAOvers: 6,
    teamABalls: 0,
    teamBRuns: 0,
    teamBWickets: 0,
    teamBOvers: 6,
    teamBBalls: 0,
    winnerName: "",
    margin: "",
  });

  const selected = fixtures.find((f) => f.id === fixtureId);

  const handleSelect = (id: string) => {
    setFixtureId(id);
    const f = fixtures.find((x) => x.id === id);
    if (f) {
      setForm((prev) => ({
        ...prev,
        teamAOvers: f.overs,
        teamBOvers: f.overs,
      }));
    }
  };

  return (
    <div className="space-y-4">
      <select
        value={fixtureId}
        onChange={(e) => handleSelect(e.target.value)}
        className="w-full px-4 py-3 rounded-xl glass-card border border-slate-200/20 bg-transparent"
      >
        <option value="">Select match…</option>
        {fixtures.map((f) => (
          <option key={f.id} value={f.id}>
            {f.matchId} — {f.teamAName} vs {f.teamBName} ({f.date})
          </option>
        ))}
      </select>

      {selected && (
        <>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-semibold text-sm text-primary">{selected.teamAName}</h4>
              <ScoreInput label="Runs" value={form.teamARuns} onChange={(v) => setForm({ ...form, teamARuns: v })} />
              <ScoreInput label="Wickets" value={form.teamAWickets} onChange={(v) => setForm({ ...form, teamAWickets: v })} />
              <div className="flex gap-2">
                <ScoreInput label="Overs" value={form.teamAOvers} onChange={(v) => setForm({ ...form, teamAOvers: v })} />
                <ScoreInput label="Balls" value={form.teamABalls} onChange={(v) => setForm({ ...form, teamABalls: v })} />
              </div>
            </div>
            <div className="space-y-3">
              <h4 className="font-semibold text-sm text-primary">{selected.teamBName}</h4>
              <ScoreInput label="Runs" value={form.teamBRuns} onChange={(v) => setForm({ ...form, teamBRuns: v })} />
              <ScoreInput label="Wickets" value={form.teamBWickets} onChange={(v) => setForm({ ...form, teamBWickets: v })} />
              <div className="flex gap-2">
                <ScoreInput label="Overs" value={form.teamBOvers} onChange={(v) => setForm({ ...form, teamBOvers: v })} />
                <ScoreInput label="Balls" value={form.teamBBalls} onChange={(v) => setForm({ ...form, teamBBalls: v })} />
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <select
              value={form.winnerName}
              onChange={(e) => setForm({ ...form, winnerName: e.target.value })}
              className="px-4 py-3 rounded-xl glass-card border border-slate-200/20 bg-transparent"
            >
              <option value="">Winner (auto from runs if empty)</option>
              <option value={selected.teamAName}>{selected.teamAName}</option>
              <option value={selected.teamBName}>{selected.teamBName}</option>
            </select>
            <input
              placeholder="Margin (e.g. 7 runs)"
              value={form.margin}
              onChange={(e) => setForm({ ...form, margin: e.target.value })}
              className="px-4 py-3 rounded-xl glass-card border border-slate-200/20 bg-transparent"
            />
          </div>

          <button
            onClick={() => onSave(selected, form)}
            className="px-6 py-3 rounded-xl bg-primary text-white font-semibold hover:brightness-110"
          >
            Save Match Result
          </button>
        </>
      )}
    </div>
  );
}

function ScoreInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs text-slate-500">{label}</span>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10) || 0)}
        className="w-full mt-1 px-3 py-2 rounded-lg glass-card border border-slate-200/20 bg-transparent"
      />
    </label>
  );
}
