import { describe, expect, it } from "vitest";
import { buildSeedData } from "@/lib/seed";
import { getOfficialDay1Scores } from "@/lib/scores/official-results";
import { buildPointsTableFromScores } from "@/lib/scores/store";

describe("official Day 1 results", () => {
  it("loads six Round 1 matches with Cluster XI at 4 overs", () => {
    const scores = getOfficialDay1Scores();
    expect(Object.keys(scores)).toHaveLength(6);
  });

  it("computes Cluster XI NRR using 4 overs faced", () => {
    const seed = buildSeedData();
    const scores = getOfficialDay1Scores();
    const table = buildPointsTableFromScores(seed.teams, seed.fixtures, scores);
    const cluster = table.find((e) => e.teamId === "the-cluster-xi");
    const collab = table.find((e) => e.teamId === "collab-ops-challengers");

    expect(cluster?.nrr).toBeCloseTo(19 / 4 - 18 / 6, 5);
    expect(collab?.nrr).toBeCloseTo(18 / 6 - 19 / 4, 5);
    expect(cluster?.rank).toBe(4);
  });
});
