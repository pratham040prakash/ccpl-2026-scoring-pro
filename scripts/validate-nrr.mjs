import { buildSeedData } from "../src/lib/seed/index.ts";
import {
  parseScoreCsv,
  buildPointsTableFromScores,
  buildStoredScore,
} from "../src/lib/scores/store.ts";
import { calculateNRR, calculateRunRate } from "../src/lib/utils.ts";

const seed = buildSeedData();
const csv = `Match_ID,Team_A_Runs,Team_A_Wickets,Team_A_Overs,Team_B_Runs,Team_B_Wickets,Team_B_Overs,Winner,Margin
R1-1,45,2,6,38,4,6,The Dial-In XI,7 runs
R1-2,52,1,6,48,3,6,Collab Ops Challengers,4 runs`;

const rows = parseScoreCsv(csv, seed.fixtures);
const scores = {};
for (const row of rows) {
  if (row.errors.length) continue;
  const fixture = seed.fixtures.find((f) => f.matchId === row.matchId);
  if (!fixture) continue;
  scores[fixture.id] = buildStoredScore(fixture, row, seed.teams, "csv");
}

const table = buildPointsTableFromScores(seed.teams, seed.fixtures, scores);
const played = table.filter((t) => t.played > 0).sort((a, b) => a.rank - b.rank);

console.log("=== Standings (R1-1 + R1-2 sample CSV) ===");
for (const e of played) {
  const sign = e.nrr >= 0 ? "+" : "";
  console.log(
    `${e.rank}. ${e.teamName.padEnd(28)} P=${e.played} W=${e.won} Pts=${e.points} RF=${e.runsFor} RA=${e.runsAgainst} NRR=${sign}${e.nrr.toFixed(3)}`
  );
}

console.log("\n=== Manual NRR cross-check ===");
for (const e of played) {
  let oversFor = 0;
  let oversAgainst = 0;
  for (const s of Object.values(scores)) {
    if (s.teamAId === e.teamId) {
      oversFor += s.teamAOvers + s.teamABalls / 6;
      oversAgainst += s.teamBOvers + s.teamBBalls / 6;
    }
    if (s.teamBId === e.teamId) {
      oversFor += s.teamBOvers + s.teamBBalls / 6;
      oversAgainst += s.teamAOvers + s.teamABalls / 6;
    }
  }
  const manual = calculateNRR(e.runsFor, oversFor, e.runsAgainst, oversAgainst);
  const ok = Math.abs(manual - e.nrr) < 0.0001 ? "OK" : "MISMATCH";
  console.log(
    `${e.teamName}: app=${e.nrr.toFixed(3)} manual=${manual.toFixed(3)} oversF=${oversFor.toFixed(2)} oversA=${oversAgainst.toFixed(2)} ${ok}`
  );
}

console.log("\n=== CRR formula spot-check ===");
console.log(`45 in 6.0 overs → CRR ${calculateRunRate(45, 6, 0).toFixed(2)} (expected 7.50)`);
console.log(`38 in 5.3 overs → CRR ${calculateRunRate(38, 5, 3).toFixed(2)} (expected 6.91)`);
