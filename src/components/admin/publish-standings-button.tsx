"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import { publishDay1StandingsClient } from "@/lib/firebase/publish-standings-client";
import { isFirebaseConfigured } from "@/lib/firebase/config";

export function PublishStandingsButton() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!isFirebaseConfigured()) return null;

  return (
    <div className="glass-card p-4 border border-emerald-500/30 space-y-3">
      <div>
        <h3 className="font-bold text-emerald-400">Publish Day 1 standings for everyone</h3>
        <p className="text-sm text-slate-400 mt-1">
          Writes official Day 1 results to Firestore so all phones and browsers show the same
          points table — not just your admin browser.
        </p>
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setMessage(null);
          try {
            const result = await publishDay1StandingsClient();
            setMessage(
              `Published ${result.teams} teams and ${result.fixtures} completed fixtures. Ask everyone to refresh Standings.`
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
        {busy ? "Publishing…" : "Publish Day 1 to Firestore"}
      </button>
      {message && <p className="text-sm text-slate-300 whitespace-pre-wrap">{message}</p>}
    </div>
  );
}
