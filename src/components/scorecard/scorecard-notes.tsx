import type { Match } from "@/types";

const PITCH_LABELS: Record<string, string> = {
  dry: "Dry",
  green: "Green",
  dusty: "Dusty",
  balanced: "Balanced",
};

export function ScorecardMatchNotes({ match }: { match: Match }) {
  const settings = match.matchSettings;
  if (!settings?.pitch && !settings?.weather) return null;

  return (
    <div className="grid sm:grid-cols-2 gap-3 p-4 text-sm">
      {settings.pitch && (
        <div className="rounded-lg border border-slate-200/60 dark:border-slate-700/60 p-3">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Pitch Report</p>
          <p className="mt-1 font-medium">{PITCH_LABELS[settings.pitch] ?? settings.pitch}</p>
        </div>
      )}
      {settings.weather && (
        <div className="rounded-lg border border-slate-200/60 dark:border-slate-700/60 p-3">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Weather</p>
          <p className="mt-1 font-medium">{settings.weather}</p>
        </div>
      )}
    </div>
  );
}
