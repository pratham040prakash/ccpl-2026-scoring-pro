import { describe, expect, it } from "vitest";
import {
  buildOfficialStandings,
  standingsPlayedCount,
} from "@/lib/server/standings-publish";

describe("standings publish", () => {
  it("builds Day 1 table with six completed matches", () => {
    const { table, scores } = buildOfficialStandings();
    expect(Object.keys(scores)).toHaveLength(6);
    expect(standingsPlayedCount(table)).toBe(12);
    expect(table.filter((entry) => entry.played > 0)).toHaveLength(12);
    expect(table[0]?.points).toBeGreaterThan(0);
  });

  it("ranks Aura Strikers first after Day 1", () => {
    const { table } = buildOfficialStandings();
    expect(table[0]?.teamId).toBe("aura-strikers");
  });
});
