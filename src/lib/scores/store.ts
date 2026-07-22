import type { Fixture, Innings, Match, PointsTableEntry, Team } from "@/types";
import type { ScoreImportRow, StoredMatchScore } from "@/types/scores";
import { calculatePointsTable } from "@/lib/engine/tournament";
import { slugify } from "@/lib/utils";

const STORAGE_KEY = "ccpl-match-scores-v1";

export function loadStoredScores(): Record<string, StoredMatchScore> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveStoredScores(scores: Record<string, StoredMatchScore>): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
}

export function parseScoreString(value: string): { runs: number; wickets: number } | null {
  const m = value.trim().match(/^(\d+)\s*\/\s*(\d+)$/);
  if (!m) return null;
  return { runs: parseInt(m[1], 10), wickets: parseInt(m[2], 10) };
}

export function parseOversString(value: string): { overs: number; balls: number } {
  const v = value.trim();
  if (!v) return { overs: 0, balls: 0 };
  if (v.includes(".")) {
    const [o, b] = v.split(".");
    return { overs: parseInt(o, 10) || 0, balls: parseInt(b, 10) || 0 };
  }
  return { overs: parseInt(v, 10) || 0, balls: 0 };
}

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, "_");
}

function findTeamId(name: string, teams: Team[]): string {
  const exact = teams.find((t) => t.name.toLowerCase() === name.toLowerCase());
  if (exact) return exact.id;
  const partial = teams.find(
    (t) =>
      t.name.toLowerCase().includes(name.toLowerCase()) ||
      name.toLowerCase().includes(t.name.toLowerCase())
  );
  return partial?.id || slugify(name);
}

function resolveWinner(
  winnerName: string,
  teamAName: string,
  teamBName: string,
  teamARuns: number,
  teamAWickets: number,
  teamBRuns: number,
  teamBWickets: number,
  maxOvers: number
): { winnerName: string; margin: string; marginType: "runs" | "wickets" } {
  const w = winnerName.trim();
  if (w) {
    const marginMatch = w.match(/(.+?)\s+(?:won by|by)\s+(.+)/i);
    if (marginMatch) {
      return {
        winnerName: marginMatch[1].trim(),
        margin: marginMatch[2].trim(),
        marginType: marginMatch[2].toLowerCase().includes("wicket") ? "wickets" : "runs",
      };
    }
    return { winnerName: w, margin: "", marginType: "runs" };
  }

  if (teamARuns > teamBRuns) {
    return {
      winnerName: teamAName,
      margin: `${teamARuns - teamBRuns} runs`,
      marginType: "runs",
    };
  }
  if (teamBRuns > teamARuns) {
    return {
      winnerName: teamBName,
      margin: `${teamBRuns - teamARuns} runs`,
      marginType: "runs",
    };
  }
  return { winnerName: teamAName, margin: "Tie", marginType: "runs" };
}

export function parseScoreCsv(csvText: string, fixtures: Fixture[]): ScoreImportRow[] {
  const lines = csvText.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map(normalizeHeader);
  const rows: ScoreImportRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = cols[idx] ?? "";
    });

    const matchId = (row.match_id || row.matchid || row.id || "").toUpperCase();
    const fixture = fixtures.find((f) => f.matchId.toUpperCase() === matchId);
    const errors: string[] = [];

    if (!matchId) errors.push("Missing Match_ID");
    if (!fixture) errors.push(`Unknown match: ${matchId}`);

    let teamARuns = parseInt(row.team_a_runs || row.runs_a || "0", 10);
    let teamAWickets = parseInt(row.team_a_wickets || row.wickets_a || "0", 10);
    let teamBRuns = parseInt(row.team_b_runs || row.runs_b || "0", 10);
    let teamBWickets = parseInt(row.team_b_wickets || row.wickets_b || "0", 10);

    const scoreA = parseScoreString(row.score_a || row.team_a_score || "");
    const scoreB = parseScoreString(row.score_b || row.team_b_score || "");
    if (scoreA) {
      teamARuns = scoreA.runs;
      teamAWickets = scoreA.wickets;
    }
    if (scoreB) {
      teamBRuns = scoreB.runs;
      teamBWickets = scoreB.wickets;
    }

    const oversA = parseOversString(row.team_a_overs || row.overs_a || String(fixture?.overs ?? 6));
    const oversB = parseOversString(row.team_b_overs || row.overs_b || String(fixture?.overs ?? 6));

    const winnerRaw = row.winner || row.winner_team || "";
    const marginRaw = row.margin || row.result || "";
    let winnerName = winnerRaw;
    let margin = marginRaw;

    if (!winnerName && fixture) {
      const resolved = resolveWinner(
        "",
        fixture.teamAName,
        fixture.teamBName,
        teamARuns,
        teamAWickets,
        teamBRuns,
        teamBWickets,
        fixture.overs
      );
      winnerName = resolved.winnerName;
      margin = margin || resolved.margin;
    }

    rows.push({
      matchId,
      teamARuns,
      teamAWickets,
      teamAOvers: oversA.overs,
      teamABalls: oversA.balls,
      teamBRuns,
      teamBWickets,
      teamBOvers: oversB.overs,
      teamBBalls: oversB.balls,
      winnerName,
      margin,
      errors,
    });
  }

  return rows;
}

export function buildStoredScore(
  fixture: Fixture,
  row: Omit<ScoreImportRow, "matchId" | "errors">,
  teams: Team[],
  source: StoredMatchScore["source"]
): StoredMatchScore {
  const resolved = resolveWinner(
    row.winnerName,
    fixture.teamAName,
    fixture.teamBName,
    row.teamARuns,
    row.teamAWickets,
    row.teamBRuns,
    row.teamBWickets,
    fixture.overs
  );

  let winnerName = resolved.winnerName || row.winnerName;
  let margin = row.margin || resolved.margin;
  let marginType = resolved.marginType;

  if (margin.toLowerCase().includes("wicket")) marginType = "wickets";

  const winnerId =
    winnerName.toLowerCase() === fixture.teamAName.toLowerCase()
      ? fixture.teamAId || findTeamId(fixture.teamAName, teams)
      : fixture.teamBId || findTeamId(fixture.teamBName, teams);

  return {
    fixtureId: fixture.id,
    matchId: fixture.matchId,
    teamAId: fixture.teamAId || findTeamId(fixture.teamAName, teams),
    teamBId: fixture.teamBId || findTeamId(fixture.teamBName, teams),
    teamAName: fixture.teamAName,
    teamBName: fixture.teamBName,
    teamARuns: row.teamARuns,
    teamAWickets: row.teamAWickets,
    teamAOvers: row.teamAOvers,
    teamABalls: row.teamABalls,
    teamBRuns: row.teamBRuns,
    teamBWickets: row.teamBWickets,
    teamBOvers: row.teamBOvers,
    teamBBalls: row.teamBBalls,
    winnerName,
    winnerId,
    margin,
    marginType,
    status: "published",
    source,
    updatedAt: new Date().toISOString(),
  };
}

export function mergeFixturesWithScores(
  fixtures: Fixture[],
  scores: Record<string, StoredMatchScore>
): Fixture[] {
  return fixtures.map((f) => {
    const score = scores[f.id] || scores[f.matchId.toLowerCase()];
    if (!score) return f;
    return {
      ...f,
      status: score.status === "published" ? "completed" : "completed",
      winnerId: score.winnerId,
      loserId: score.winnerId === score.teamAId ? score.teamBId : score.teamAId,
    };
  });
}

export function buildPointsTableFromScores(
  teams: Team[],
  fixtures: Fixture[],
  scores: Record<string, StoredMatchScore>
): PointsTableEntry[] {
  const matches: Match[] = [];
  const inningsMap: Record<string, Innings[]> = {};

  for (const fixture of fixtures) {
    const score = scores[fixture.id];
    if (!score) continue;

    const matchId = fixture.id;
    matches.push({
      id: matchId,
      fixtureId: fixture.id,
      matchId: fixture.matchId,
      stage: fixture.stage,
      status: "completed",
      date: fixture.date,
      startTime: fixture.startTime,
      ground: fixture.ground,
      overs: fixture.overs,
      teamAId: score.teamAId,
      teamBId: score.teamBId,
      teamAName: score.teamAName,
      teamBName: score.teamBName,
      playingXiA: [],
      playingXiB: [],
      result: {
        winnerId: score.winnerId,
        winnerName: score.winnerName,
        margin: score.margin,
        marginType: score.marginType,
        summary: `${score.winnerName} won by ${score.margin}`,
      },
      locked: true,
      published: true,
      shareSlug: fixture.id,
      createdAt: score.updatedAt,
      updatedAt: score.updatedAt,
    });

    inningsMap[matchId] = [
      {
        id: `${matchId}-inn1`,
        matchId,
        teamId: score.teamAId,
        teamName: score.teamAName,
        inningsNumber: 1,
        runs: score.teamARuns,
        wickets: score.teamAWickets,
        overs: score.teamAOvers,
        balls: score.teamABalls,
        extras: { total: 0, wides: 0, noBalls: 0, byes: 0, legByes: 0, penalty: 0 },
        runRate: 0,
        partnership: { runs: 0, balls: 0, batsman1Id: "", batsman2Id: "", batsman1Runs: 0, batsman2Runs: 0 },
        completed: true,
        createdAt: score.updatedAt,
        updatedAt: score.updatedAt,
      },
      {
        id: `${matchId}-inn2`,
        matchId,
        teamId: score.teamBId,
        teamName: score.teamBName,
        inningsNumber: 2,
        runs: score.teamBRuns,
        wickets: score.teamBWickets,
        overs: score.teamBOvers,
        balls: score.teamBBalls,
        extras: { total: 0, wides: 0, noBalls: 0, byes: 0, legByes: 0, penalty: 0 },
        runRate: 0,
        partnership: { runs: 0, balls: 0, batsman1Id: "", batsman2Id: "", batsman1Runs: 0, batsman2Runs: 0 },
        completed: true,
        createdAt: score.updatedAt,
        updatedAt: score.updatedAt,
      },
    ];
  }

  return calculatePointsTable(teams, matches, inningsMap, {
    pointsWin: 2,
    pointsTie: 1,
    pointsNr: 1,
  });
}

export const SCORE_CSV_TEMPLATE = `Match_ID,Team_A_Runs,Team_A_Wickets,Team_A_Overs,Team_B_Runs,Team_B_Wickets,Team_B_Overs,Winner,Margin
R1-1,45,2,6,38,4,6,The Dial-In XI,7 runs
R1-2,52,1,6,48,3,6,Collab Ops Challengers,4 runs`;

export const SCORE_CSV_SIMPLE = `Match_ID,Score_A,Score_B,Winner,Margin
R1-1,45/2,38/4,The Dial-In XI,7 runs`;
