import type {
  Fixture,
  Innings,
  Match,
  MatchStage,
  PointsTableEntry,
  Team,
  TeamStats,
} from "@/types";
import { calculateNRR } from "@/lib/utils";

const STAGE_ORDER: MatchStage[] = [
  "round_1",
  "integration",
  "quarter_final",
  "semi_final",
  "final",
];

export function getNextStage(current: MatchStage): MatchStage | null {
  const idx = STAGE_ORDER.indexOf(current);
  return idx < STAGE_ORDER.length - 1 ? STAGE_ORDER[idx + 1] : null;
}

export function calculatePointsTable(
  teams: Team[],
  matches: Match[],
  inningsMap: Record<string, Innings[]>,
  settings: { pointsWin: number; pointsTie: number; pointsNr: number }
): PointsTableEntry[] {
  const table: Record<string, PointsTableEntry> = {};

  for (const team of teams) {
    table[team.id] = {
      teamId: team.id,
      teamName: team.name,
      played: 0,
      won: 0,
      lost: 0,
      tied: 0,
      nr: 0,
      points: 0,
      runsFor: 0,
      runsAgainst: 0,
      nrr: 0,
      rank: 0,
    };
  }

  const completed = matches.filter(
    (m) => m.status === "completed" || m.status === "locked" || m.status === "published"
  );

  for (const match of completed) {
    if (!match.result) continue;
    const teamA = table[match.teamAId];
    const teamB = table[match.teamBId];
    if (!teamA || !teamB) continue;

    teamA.played++;
    teamB.played++;

    const innings = inningsMap[match.id] || [];
    const innA = innings.find((i) => i.teamId === match.teamAId);
    const innB = innings.find((i) => i.teamId === match.teamBId);

    if (innA) {
      teamA.runsFor += innA.runs;
      teamA.runsAgainst += innB?.runs ?? 0;
    }
    if (innB) {
      teamB.runsFor += innB.runs;
      teamB.runsAgainst += innA?.runs ?? 0;
    }

    if (match.result.winnerId === match.teamAId) {
      teamA.won++;
      teamA.points += settings.pointsWin;
      teamB.lost++;
    } else if (match.result.winnerId === match.teamBId) {
      teamB.won++;
      teamB.points += settings.pointsWin;
      teamA.lost++;
    }
  }

  const entries = Object.values(table).map((entry) => {
    const team = teams.find((t) => t.id === entry.teamId);
    const oversFor = team?.stats.oversFor || entry.played * 6;
    const oversAgainst = team?.stats.oversAgainst || entry.played * 6;
    entry.nrr = calculateNRR(
      entry.runsFor,
      oversFor,
      entry.runsAgainst,
      oversAgainst
    );
    return entry;
  });

  return rankTeams(entries);
}

export function rankTeams(entries: PointsTableEntry[]): PointsTableEntry[] {
  const sorted = [...entries].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.nrr !== a.nrr) return b.nrr - a.nrr;
    return b.runsFor - a.runsFor;
  });

  return sorted.map((entry, idx) => ({ ...entry, rank: idx + 1 }));
}

export function findBestLosingTeam(
  fixtures: Fixture[],
  matches: Match[],
  pointsTable: PointsTableEntry[]
): string | null {
  const r1Fixtures = fixtures.filter((f) => f.stage === "round_1");
  const losers: PointsTableEntry[] = [];

  for (const fixture of r1Fixtures) {
    const match = matches.find((m) => m.fixtureId === fixture.id);
    if (!match?.result) continue;
    const loserId =
      match.result.winnerId === match.teamAId
        ? match.teamBId
        : match.teamAId;
    const entry = pointsTable.find((p) => p.teamId === loserId);
    if (entry) losers.push(entry);
  }

  if (losers.length === 0) return null;

  losers.sort((a, b) => {
    if (b.nrr !== a.nrr) return b.nrr - a.nrr;
    return b.runsFor - a.runsFor;
  });

  return losers[0].teamId;
}

export function resolveKnockoutTeams(
  fixtures: Fixture[],
  matches: Match[],
  pointsTable: PointsTableEntry[]
): Fixture[] {
  return fixtures.map((fixture) => {
    const updated = { ...fixture };

    if (fixture.placeholderA) {
      updated.teamAId = resolvePlaceholder(
        fixture.placeholderA,
        fixtures,
        matches,
        pointsTable
      );
    }
    if (fixture.placeholderB) {
      updated.teamBId = resolvePlaceholder(
        fixture.placeholderB,
        fixtures,
        matches,
        pointsTable
      );
    }

    if (fixture.stage === "quarter_final" && fixture.seedA && fixture.seedB) {
      const seedA = pointsTable.find((p) => p.rank === fixture.seedA);
      const seedB = pointsTable.find((p) => p.rank === fixture.seedB);
      if (seedA) updated.teamAId = seedA.teamId;
      if (seedB) updated.teamBId = seedB.teamId;
    }

    return updated;
  });
}

function resolvePlaceholder(
  placeholder: string,
  fixtures: Fixture[],
  matches: Match[],
  pointsTable: PointsTableEntry[]
): string {
  const lower = placeholder.toLowerCase();

  if (lower.includes("best loos") || lower.includes("best losing")) {
    return findBestLosingTeam(fixtures, matches, pointsTable) || "";
  }

  // R1 9th Winner, R1 8th Winner, R1 7th Winner
  const r1OrdinalWinner = placeholder.match(/r1\s+(\d+)(?:st|nd|rd|th)?\s+winner/i);
  if (r1OrdinalWinner) {
    const matchNum = r1OrdinalWinner[1];
    return getWinnerOfMatchId(`R1-${matchNum}`, fixtures, matches);
  }

  // QuarterFinal Winner 1 / QuaterFinal Winner 1
  const qfWinner = placeholder.match(/quater?final\s+winner\s+(\d+)/i);
  if (qfWinner) {
    return getWinnerOfMatchId(`QF${qfWinner[1]}`, fixtures, matches);
  }

  // SF1 Winner, SF2 Winner
  const sfWinner = placeholder.match(/sf(\d+)\s+winner/i);
  if (sfWinner) {
    return getWinnerOfMatchId(`SF${sfWinner[1]}`, fixtures, matches);
  }

  const winnerMatch = placeholder.match(/winner\s+(r\d+-\d+|qf\d+|sf\d+|r2-\d+)/i);
  if (winnerMatch) {
    return getWinnerOfMatchId(winnerMatch[1].toUpperCase(), fixtures, matches);
  }

  const seedMatch = placeholder.match(/seed\s+(\d+)/i);
  if (seedMatch) {
    const seed = parseInt(seedMatch[1], 10);
    return pointsTable.find((p) => p.rank === seed)?.teamId || "";
  }

  return "";
}

function getWinnerOfMatchId(
  matchId: string,
  fixtures: Fixture[],
  matches: Match[]
): string {
  const fixture = fixtures.find(
    (f) => f.matchId.toUpperCase() === matchId.toUpperCase()
  );
  if (!fixture) return "";
  const match = matches.find((m) => m.fixtureId === fixture.id);
  return match?.result?.winnerId || "";
}

export function canProgressStage(
  stage: MatchStage,
  fixtures: Fixture[]
): boolean {
  const stageFixtures = fixtures.filter((f) => f.stage === stage);
  return stageFixtures.every(
    (f) =>
      f.status === "completed" ||
      f.status === "locked" ||
      f.status === "published"
  );
}

export function updateTeamStatsAfterMatch(
  stats: TeamStats,
  won: boolean,
  runsFor: number,
  runsAgainst: number,
  oversFor: number,
  oversAgainst: number,
  pointsWin: number
): TeamStats {
  const updated = { ...stats };
  updated.played++;
  if (won) {
    updated.won++;
    updated.points += pointsWin;
  } else {
    updated.lost++;
  }
  updated.runsFor += runsFor;
  updated.runsAgainst += runsAgainst;
  updated.oversFor += oversFor;
  updated.oversAgainst += oversAgainst;
  updated.nrr = calculateNRR(
    updated.runsFor,
    updated.oversFor,
    updated.runsAgainst,
    updated.oversAgainst
  );
  updated.runRate =
    updated.oversFor > 0 ? updated.runsFor / updated.oversFor : 0;
  return updated;
}
