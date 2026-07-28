"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import { publishDay1StandingsClient, publishRound2FixturesClient } from "@/lib/firebase/publish-standings-client";
import { isFirebaseConfigured } from "@/lib/firebase/config";

export function PublishStandingsButton() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!isFirebaseConfigured()) return null;

  return (
    <div className="glass-card p-4 border border-emerald-500/30 space-y-3">
      <div>
        <h3 className="font-bold text-emerald-400">Publish standings & Round 2 fixtures</h3>
        <p className="text-sm text-slate-400 mt-1">
          Writes standings and confirmed Round 2 pairings to Firestore so all devices show the same
          points table and fixtures.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setMessage(null);
          try {
            const result = await publishDay1StandingsClient();
            const round2 = await publishRound2FixturesClient();
            setMessage(
              `Published ${result.teams} teams, ${result.fixtures} R1 results, and ${round2} Round 2 fixtures. Ask everyone to refresh.`
            );
          } catch (error) {
            setMessage(error instanceof Error ? error.message : String(error));
          } finally {
            setBusy(false);
          }
        }}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold disabled:opacity-50"
      >
        <Upload className="w-4 h-4" />
        {busy ? "Publishing…" : "Publish to Firestore"}
      </button>
      </div>
      {message && <p className="text-sm text-slate-300 whitespace-pre-wrap">{message}</p>}
    </div>
  );
}
