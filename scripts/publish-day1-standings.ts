/**
 * Publish fair standings + fixtures to Firestore (all users, mobile + desktop).
 *
 * Usage:
 *   cp .env.example .env.local   # add FIREBASE_SERVICE_ACCOUNT_JSON
 *   npm run publish:standings
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getFirebaseAdminDb, isFirebaseAdminConfigured } from "../src/lib/firebase/admin";
import {
  buildOfficialStandings,
  publishOfficialStandingsToFirestore,
  syncUnifiedStandingsToFirestore,
} from "../src/lib/server/standings-publish";
import { syncKnockoutFixturesToFirestore } from "../src/lib/server/tournament-sync";

function loadEnvLocal(): void {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    if (process.env[key]) continue;
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

async function main() {
  loadEnvLocal();
  if (!isFirebaseAdminConfigured()) {
    console.error("Set FIREBASE_SERVICE_ACCOUNT_JSON in .env.local (one-line JSON).");
    process.exit(1);
  }

  const db = getFirebaseAdminDb();
  if (!db) {
    console.error("Failed to initialize Firebase Admin.");
    process.exit(1);
  }

  const bundled = await publishOfficialStandingsToFirestore(db);
  const unified = await syncUnifiedStandingsToFirestore(db);
  const knockouts = await syncKnockoutFixturesToFirestore(db);
  const { scores } = buildOfficialStandings();

  console.log(
    `Done: ${Object.keys(scores).length} bundled matches, ${bundled.matchesPublished} fixtures marked completed.`
  );
  console.log(`Unified table: ${unified.table.length} teams (${unified.liveMatchCount} live merges).`);
  console.log(
    `Knockouts: R2=${knockouts.round2}, QF=${knockouts.quarterFinals}, fixtures updated=${knockouts.updated}.`
  );
  console.log(`#1: ${unified.table[0]?.teamName} · #7: ${unified.table.find((e) => e.rank === 7)?.teamName} · #8: ${unified.table.find((e) => e.rank === 8)?.teamName}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
