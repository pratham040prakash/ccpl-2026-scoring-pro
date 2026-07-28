import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildSeedData } from "../src/lib/seed";
import { resolveFixturesWithScores } from "../src/lib/scores/fixture-resolution";
import {
  getAllOfficialScores,
  getBundledFairPointsTable,
  getBundledOfficialPointsTable,
} from "../src/lib/scores/official-results";

const outDir = join(process.cwd(), "public/data");
mkdirSync(outDir, { recursive: true });

const now = new Date().toISOString();
const day1Table = getBundledOfficialPointsTable();
const fairTable = getBundledFairPointsTable();
const scores = getAllOfficialScores();
const seed = buildSeedData();
const fixtures = resolveFixturesWithScores(seed.fixtures, scores, seed.teams);

writeFileSync(
  join(outDir, "day1-standings.json"),
  JSON.stringify({ updatedAt: now, source: "official-day1", table: day1Table }, null, 2)
);

writeFileSync(
  join(outDir, "standings.json"),
  JSON.stringify(
    {
      updatedAt: now,
      source: "fair-r1-plus-r2-placement",
      table: fairTable,
      matchCount: Object.keys(scores).length,
    },
    null,
    2
  )
);

writeFileSync(
  join(outDir, "fixtures.json"),
  JSON.stringify(
    {
      updatedAt: now,
      source: "fair-r1-plus-r2-placement",
      fixtures,
    },
    null,
    2
  )
);

writeFileSync(
  join(outDir, "scores.json"),
  JSON.stringify(
    {
      updatedAt: now,
      source: "official-all-matches",
      scores,
    },
    null,
    2
  )
);

console.log(`Generated day1-standings.json (${day1Table.length} teams)`);
console.log(`Generated standings.json (${fairTable.length} teams, ${Object.keys(scores).length} matches)`);
console.log(`Generated fixtures.json (${fixtures.length} fixtures)`);
console.log(`Generated scores.json (${Object.keys(scores).length} match results)`);
