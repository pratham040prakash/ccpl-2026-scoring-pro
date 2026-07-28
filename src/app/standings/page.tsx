import { PointsTable } from "@/components/dashboard/points-table";
import { getFirebaseAdminDb, isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import {
  buildOfficialStandings,
  buildUnifiedStandingsFromFirestore,
} from "@/lib/server/standings-publish";
import { StandingsActions } from "./standings-actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function StandingsPage() {
  let table = buildOfficialStandings().table;

  if (isFirebaseAdminConfigured()) {
    const db = getFirebaseAdminDb();
    if (db) {
      try {
        const unified = await buildUnifiedStandingsFromFirestore(db);
        table = unified.table;
      } catch {
        /* keep Day 1 fallback */
      }
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black">Points Table</h1>
          <p className="text-slate-500">Auto-ranked · Top 8 qualify for knockouts</p>
        </div>
        <StandingsActions pointsTable={table} />
      </div>

      <PointsTable entries={table} />
    </div>
  );
}
