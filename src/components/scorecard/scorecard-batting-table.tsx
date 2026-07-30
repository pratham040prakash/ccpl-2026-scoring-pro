import type { Innings } from "@/types";
import type { ScorecardBatterRow } from "@/lib/match/scorecard-analytics";
import { formatExtrasBreakdown } from "@/lib/match/match-scorecard";
import { inningsRunRate } from "@/lib/match/scorecard-analytics";

interface ScorecardBattingTableProps {
  innings: Innings;
  batters: ScorecardBatterRow[];
}

export function ScorecardBattingTable({ innings, batters }: ScorecardBattingTableProps) {
  const activeBatters = batters.filter((b) => b.status !== "did_not_bat");
  const didNotBat = batters.filter((b) => b.status === "did_not_bat");

  return (
    <div>
      <div className="flex items-center justify-between bg-emerald-700 px-4 py-3 text-white">
        <span className="font-semibold">{innings.teamName}</span>
        <span className="font-mono font-bold">
          {innings.runs}/{innings.wickets} ({innings.overs}.{innings.balls} Ov)
        </span>
      </div>

      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead>
            <tr className="border-b border-slate-200/60 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-900/50">
              <th className="px-4 py-2 font-semibold sticky left-0 bg-slate-50 dark:bg-slate-900/50">Batter</th>
              <th className="px-2 py-2 font-semibold">Dismissal</th>
              <th className="px-2 py-2 text-right font-semibold">R</th>
              <th className="px-2 py-2 text-right font-semibold">B</th>
              <th className="px-2 py-2 text-right font-semibold">Min</th>
              <th className="px-2 py-2 text-right font-semibold">4s</th>
              <th className="px-2 py-2 text-right font-semibold">6s</th>
              <th className="px-2 py-2 text-right font-semibold">SR</th>
            </tr>
          </thead>
          <tbody>
            {activeBatters.map((b) => (
              <BatterRow key={b.playerId} batter={b} />
            ))}
          </tbody>
        </table>
      </div>

      <div className="md:hidden divide-y divide-slate-200/40 dark:divide-slate-700/40">
        {activeBatters.map((b) => (
          <MobileBatterCard key={b.playerId} batter={b} />
        ))}
      </div>

      {didNotBat.length > 0 && (
        <div className="px-4 py-3 text-sm text-slate-500 border-t border-slate-200/40 dark:border-slate-700/40">
          <span className="font-semibold text-slate-600 dark:text-slate-300">Did not bat: </span>
          {didNotBat.map((b) => b.playerName).join(", ")}
        </div>
      )}

      <ExtrasAndTotal innings={innings} />
    </div>
  );
}

function Badges({ batter }: { batter: ScorecardBatterRow }) {
  return (
    <span className="ml-1.5 inline-flex gap-1">
      {batter.isCaptain && (
        <span className="rounded bg-amber-500/20 px-1 text-[10px] font-bold text-amber-700 dark:text-amber-300">
          C
        </span>
      )}
      {batter.isWicketKeeper && (
        <span className="rounded bg-blue-500/20 px-1 text-[10px] font-bold text-blue-700 dark:text-blue-300">
          WK
        </span>
      )}
      {batter.isAtCrease && (
        <span className="rounded bg-emerald-500/20 px-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
          *
        </span>
      )}
    </span>
  );
}

function BatterRow({ batter }: { batter: ScorecardBatterRow }) {
  return (
    <tr className="border-b border-slate-100 last:border-0 dark:border-slate-800">
      <td className="px-4 py-3 sticky left-0 bg-white dark:bg-slate-950">
        <div className="flex items-center gap-2">
          {batter.photoUrl ? (
            <img src={batter.photoUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
              {batter.playerName.charAt(0)}
            </div>
          )}
          <div>
            <span className="font-medium text-primary">
              {batter.playerName}
              <Badges batter={batter} />
            </span>
          </div>
        </div>
      </td>
      <td className="px-2 py-3 text-slate-500 capitalize">{batter.dismissal}</td>
      <td className="px-2 py-3 text-right font-semibold">{batter.runs}</td>
      <td className="px-2 py-3 text-right">{batter.balls}</td>
      <td className="px-2 py-3 text-right">{batter.minutes}</td>
      <td className="px-2 py-3 text-right">{batter.fours}</td>
      <td className="px-2 py-3 text-right">{batter.sixes}</td>
      <td className="px-2 py-3 text-right">{batter.strikeRate.toFixed(2)}</td>
    </tr>
  );
}

function MobileBatterCard({ batter }: { batter: ScorecardBatterRow }) {
  return (
    <div className="px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-primary">
            {batter.playerName}
            <Badges batter={batter} />
          </p>
          <p className="text-xs text-slate-500 mt-0.5 capitalize">{batter.dismissal}</p>
        </div>
        <p className="font-mono font-bold text-lg">
          {batter.runs}
          <span className="text-sm font-normal text-slate-500"> ({batter.balls})</span>
        </p>
      </div>
      <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
        <span>4s {batter.fours}</span>
        <span>6s {batter.sixes}</span>
        <span>SR {batter.strikeRate.toFixed(1)}</span>
        <span>{batter.minutes}m</span>
      </div>
    </div>
  );
}

function ExtrasAndTotal({ innings }: { innings: Innings }) {
  const rr = inningsRunRate(innings);
  const { extras } = innings;

  return (
    <div className="border-t border-slate-200/60 dark:border-slate-700/60 text-sm">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 px-4 py-3 bg-slate-50/80 dark:bg-slate-900/30">
        <ExtraChip label="Wide" value={extras.wides} />
        <ExtraChip label="No Ball" value={extras.noBalls} />
        <ExtraChip label="Bye" value={extras.byes} />
        <ExtraChip label="Leg Bye" value={extras.legByes} />
        <ExtraChip label="Penalty" value={extras.penalty} />
        <ExtraChip label="Total Extras" value={extras.total} bold />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
        <span className="font-semibold">
          Total {innings.runs}/{innings.wickets}
        </span>
        <span className="text-slate-500">
          {innings.overs}.{innings.balls} Ov · RR {rr.toFixed(2)} ·{" "}
          {formatExtrasBreakdown(extras)}
        </span>
      </div>
    </div>
  );
}

function ExtraChip({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <div className="text-center sm:text-left">
      <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className={bold ? "font-bold" : "font-medium"}>{value}</p>
    </div>
  );
}
