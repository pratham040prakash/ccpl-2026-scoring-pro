/**
 * Publish Day 1 standings to Firestore (fixes mobile + all users on current production).
 *
 * Usage:
 *   cp .env.example .env.local   # add FIREBASE_SERVICE_ACCOUNT_JSON
 *   npm run publish:standings
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getFirebaseAdminDb, isFirebaseAdminConfigured } from "../src/lib/firebase/admin";
import { publishOfficialStandingsToFirestore } from "../src/lib/server/standings-publish";

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

  const result = await publishOfficialStandingsToFirestore(db);
  console.log(
    `Done: ${result.matchesPublished} matches, ${result.table.length} teams in pointsTable.`
  );
  console.log(`#1: ${result.table[0]?.teamName} (${result.table[0]?.points} pts)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
