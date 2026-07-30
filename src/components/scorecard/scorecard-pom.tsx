import type { Match, Player } from "@/types";
import type { MatchAnalytics } from "@/lib/match/scorecard-analytics";
import { Award } from "lucide-react";

export function ScorecardPlayerOfMatch({
  match,
  analytics,
  players,
}: {
  match: Match;
  analytics: MatchAnalytics | null;
  players: Player[];
}) {
  const pom = analytics?.playerOfMatch;
  if (!pom && !match.playerOfMatchId) return null;

  const player = players.find((p) => p.id === (pom?.playerId ?? match.playerOfMatchId));

  return (
    <div className="flex items-center gap-4 p-4">
      <div className="shrink-0 w-16 h-16 rounded-full bg-amber-500/15 flex items-center justify-center">
        {player?.photoUrl ? (
          <img src={player.photoUrl} alt="" className="w-16 h-16 rounded-full object-cover" />
        ) : (
          <Award className="w-8 h-8 text-amber-600" />
        )}
      </div>
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-amber-600">Player of the Match</p>
        <p className="text-xl font-black text-primary mt-0.5">
          {pom?.playerName ?? player?.name ?? "—"}
        </p>
        {pom?.reason && <p className="text-sm text-slate-500 mt-1">{pom.reason}</p>}
      </div>
    </div>
  );
}
