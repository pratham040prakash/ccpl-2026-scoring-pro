import { describe, expect, it } from "vitest";
import {
  buildOfficialStandings,
  standingsPlayedCount,
} from "@/lib/server/standings-publish";
import {
  getAllOfficialScores,
  getBundledFairPointsTable,
  officialStandingsPlayedCount,
} from "@/lib/scores/official-results";

describe("standings publish", () => {
  it("builds fair table from all bundled match results", () => {
    const { table, scores } = buildOfficialStandings();
    expect(Object.keys(scores).length).toBeGreaterThanOrEqual(11);
    expect(standingsPlayedCount(table)).toBeGreaterThanOrEqual(18);
    expect(table.find((entry) => entry.rank === 7)?.teamName).toBe("Play Bold XI");
    expect(table.find((entry) => entry.rank === 8)?.teamName).toBe("11 Daulath's");
  });

  it("exposes bundled fair points table for client initial render", () => {
    const table = getBundledFairPointsTable();
    expect(officialStandingsPlayedCount(table)).toBeGreaterThanOrEqual(18);
    expect(Object.keys(getAllOfficialScores()).length).toBeGreaterThanOrEqual(11);
  });
});
