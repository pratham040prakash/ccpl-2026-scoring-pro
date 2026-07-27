import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getBundledOfficialPointsTable } from "../src/lib/scores/official-results";

const outDir = join(process.cwd(), "public/data");
mkdirSync(outDir, { recursive: true });

const table = getBundledOfficialPointsTable();
const payload = {
  updatedAt: new Date().toISOString(),
  source: "official-day1",
  table,
};

writeFileSync(join(outDir, "day1-standings.json"), JSON.stringify(payload, null, 2));
console.log(`Generated day1-standings.json (${table.length} teams)`);
