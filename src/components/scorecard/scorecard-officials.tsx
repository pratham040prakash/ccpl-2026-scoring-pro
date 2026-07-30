import type { Match } from "@/types";

export function ScorecardOfficials({ match }: { match: Match }) {
  const officials = match.officials;
  if (!officials?.scorer && !officials?.umpires) return null;

  const rows = [
    officials.scorer && { role: "Scorer", name: officials.scorer },
    officials.umpires && { role: "Umpires", name: officials.umpires },
  ].filter(Boolean) as { role: string; name: string }[];

  return (
    <div className="grid sm:grid-cols-2 gap-3 p-4">
      {rows.map((row) => (
        <div key={row.role} className="rounded-lg bg-slate-50 dark:bg-slate-900/40 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{row.role}</p>
          <p className="font-medium mt-1">{row.name}</p>
        </div>
      ))}
      <div className="rounded-lg bg-slate-50 dark:bg-slate-900/40 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Organizer</p>
        <p className="font-medium mt-1">CCPL 2026</p>
      </div>
    </div>
  );
}
