import type {
  Announcement,
  Fixture,
  Match,
  MatchStage,
  Player,
  Team,
  TournamentSettings,
} from "@/types";
import { slugify, generateId } from "@/lib/utils";
import teamsData from "@/data/teams.json";

interface SeedTeam {
  name: string;
  shortName: string;
  captain: string;
  captainEmail?: string;
  status?: string;
  need?: string;
  players: { name: string; email?: string }[];
}

function isCaptainPlayer(team: SeedTeam, player: { name: string; email?: string }): boolean {
  if (player.name === team.captain) return true;
  if (team.captainEmail && player.email === team.captainEmail) return true;
  return false;
}

const emptyStats = () => ({
  played: 0,
  won: 0,
  lost: 0,
  tied: 0,
  nr: 0,
  points: 0,
  runsFor: 0,
  runsAgainst: 0,
  oversFor: 0,
  oversAgainst: 0,
  nrr: 0,
  runRate: 0,
});

const emptyPlayerStats = () => ({
  matches: 0,
  innings: 0,
  runs: 0,
  balls: 0,
  fours: 0,
  sixes: 0,
  strikeRate: 0,
  highestScore: 0,
  fifties: 0,
  hundreds: 0,
  wickets: 0,
  ballsBowled: 0,
  runsConceded: 0,
  economy: 0,
  average: 0,
  bestBowling: "-",
  catches: 0,
  runOuts: 0,
  mvpPoints: 0,
});

export function buildSeedData(): {
  teams: Team[];
  players: Player[];
  fixtures: Fixture[];
  settings: TournamentSettings;
  announcements: Announcement[];
} {
  const now = new Date().toISOString();
  const teams: Team[] = [];
  const players: Player[] = [];
  const teamIdMap: Record<string, string> = {};

  for (const t of teamsData as SeedTeam[]) {
    const teamId = slugify(t.name);
    teamIdMap[t.name] = teamId;
    const playerIds: string[] = [];

    for (const p of t.players) {
      const playerId = slugify(`${t.name}-${p.name}`);
      playerIds.push(playerId);
      players.push({
        id: playerId,
        name: p.name,
        email: p.email,
        teamId,
        role: isCaptainPlayer(t, p) ? "all_rounder" : "batsman",
        battingStyle: "right_hand",
        bowlingStyle: "right_arm_fast",
        isCaptain: isCaptainPlayer(t, p),
        stats: emptyPlayerStats(),
        awards: [],
        createdAt: now,
        updatedAt: now,
      });
    }

    const captainPlayer = players.find((p) => p.teamId === teamId && p.isCaptain);

    teams.push({
      id: teamId,
      name: t.name,
      shortName: t.shortName,
      captainId: captainPlayer?.id,
      playerIds,
      stats: emptyStats(),
      createdAt: now,
      updatedAt: now,
    });
  }

  const resolveTeam = (name: string): string => {
    const aliases: Record<string, string> = {
      "The Dial XI": "The Dial-In XI",
      "Lifecycle cricket team": "Lifecycle Cricket Team",
    };
    const resolved = aliases[name] || name;
    return teamIdMap[resolved] || slugify(resolved);
  };

  const fixtureDefs: Array<Omit<Fixture, "id" | "teamAId" | "teamBId"> & { teamAId?: string; teamBId?: string }> = [
    // Day 1 — Mon 27 Jul 2026 · Round 1 · 6 overs
    { matchId: "R1-1", date: "2026-07-27", day: 1, startTime: "09:00", endTime: "10:00", teamAName: "The Dial-In XI", teamBName: "Bengaluru Blasters", stage: "round_1", overs: 6, ground: "Ground 1", status: "scheduled", order: 1 },
    { matchId: "R1-2", date: "2026-07-27", day: 1, startTime: "10:00", endTime: "11:00", teamAName: "Collab Ops Challengers", teamBName: "The Cluster XI", stage: "round_1", overs: 6, ground: "Ground 1", status: "scheduled", order: 2 },
    { matchId: "R1-3", date: "2026-07-27", day: 1, startTime: "11:00", endTime: "12:00", teamAName: "Aura Strikers", teamBName: "Cloud Chorus XI", stage: "round_1", overs: 6, ground: "Ground 1", status: "scheduled", order: 3 },
    { matchId: "R1-4", date: "2026-07-27", day: 1, startTime: "12:00", endTime: "13:00", teamAName: "Sixco CC XI", teamBName: "Play Bold XI", stage: "round_1", overs: 6, ground: "Ground 1", status: "scheduled", order: 4 },
    { matchId: "R1-5", date: "2026-07-27", day: 1, startTime: "13:00", endTime: "14:00", teamAName: "Data Warriors", teamBName: "Sixco SuperStrikers", stage: "round_1", overs: 6, ground: "Ground 1", status: "scheduled", order: 5 },
    { matchId: "R1-6", date: "2026-07-27", day: 1, startTime: "14:00", endTime: "15:00", teamAName: "Hit and Run", teamBName: "Rising Stars", stage: "round_1", overs: 6, ground: "Ground 1", status: "scheduled", order: 6 },
    // Day 2 — Tue 28 Jul 2026 · Round 1 + Round 2 · 6 overs
    { matchId: "R1-7", date: "2026-07-28", day: 2, startTime: "09:00", endTime: "10:00", teamAName: "Royal Ciscoians Bengaluru RCB", teamBName: "Collab Super Kings", stage: "round_1", overs: 6, ground: "Ground 1", status: "scheduled", order: 7 },
    { matchId: "R1-8", date: "2026-07-28", day: 2, startTime: "10:00", endTime: "11:00", teamAName: "Cisco Super Kings CSK", teamBName: "Slog Squad", stage: "round_1", overs: 6, ground: "Ground 1", status: "scheduled", order: 8 },
    { matchId: "R1-9", date: "2026-07-28", day: 2, startTime: "11:00", endTime: "12:00", teamAName: "11 Daulath's", teamBName: "Lifecycle Cricket Team", stage: "round_1", overs: 6, ground: "Ground 1", status: "scheduled", order: 9 },
    { matchId: "R2-1", date: "2026-07-28", day: 2, startTime: "12:00", endTime: "13:00", teamAName: "R1 9th Winner", teamBName: "R1 Best Looser 1", stage: "integration", overs: 6, ground: "Ground 1", status: "scheduled", order: 10, placeholderA: "R1 9th Winner", placeholderB: "R1 Best Looser 1" },
    { matchId: "R2-2", date: "2026-07-28", day: 2, startTime: "13:00", endTime: "14:00", teamAName: "R1 8th Winner", teamBName: "R1 7th Winner", stage: "integration", overs: 6, ground: "Ground 1", status: "scheduled", order: 11, placeholderA: "R1 8th Winner", placeholderB: "R1 7th Winner" },
    // Day 3 — Wed 29 Jul 2026 · Quarter-Finals · 8 overs
    { matchId: "QF1", date: "2026-07-29", day: 3, startTime: "09:00", endTime: "10:15", teamAName: "Seed 1", teamBName: "Seed 8", stage: "quarter_final", overs: 8, ground: "Ground 1", status: "scheduled", order: 12, seedA: 1, seedB: 8, placeholderA: "Seed 1", placeholderB: "Seed 8" },
    { matchId: "QF2", date: "2026-07-29", day: 3, startTime: "10:15", endTime: "11:30", teamAName: "Seed 2", teamBName: "Seed 7", stage: "quarter_final", overs: 8, ground: "Ground 1", status: "scheduled", order: 13, seedA: 2, seedB: 7, placeholderA: "Seed 2", placeholderB: "Seed 7" },
    { matchId: "QF3", date: "2026-07-29", day: 3, startTime: "11:30", endTime: "12:45", teamAName: "Seed 3", teamBName: "Seed 6", stage: "quarter_final", overs: 8, ground: "Ground 1", status: "scheduled", order: 14, seedA: 3, seedB: 6, placeholderA: "Seed 3", placeholderB: "Seed 6" },
    { matchId: "QF4", date: "2026-07-29", day: 3, startTime: "12:45", endTime: "14:00", teamAName: "Seed 4", teamBName: "Seed 5", stage: "quarter_final", overs: 8, ground: "Ground 1", status: "scheduled", order: 15, seedA: 4, seedB: 5, placeholderA: "Seed 4", placeholderB: "Seed 5" },
    // Day 4 — Thu 30 Jul 2026 · Semi-Finals + Final · 10 overs
    { matchId: "SF1", date: "2026-07-30", day: 4, startTime: "09:00", endTime: "11:00", teamAName: "QuarterFinal Winner 1", teamBName: "QuarterFinal Winner 4", stage: "semi_final", overs: 10, ground: "Ground 1", status: "scheduled", order: 16, placeholderA: "QuarterFinal Winner 1", placeholderB: "QuarterFinal Winner 4" },
    { matchId: "SF2", date: "2026-07-30", day: 4, startTime: "11:00", endTime: "13:00", teamAName: "QuarterFinal Winner 2", teamBName: "QuarterFinal Winner 3", stage: "semi_final", overs: 10, ground: "Ground 1", status: "scheduled", order: 17, placeholderA: "QuarterFinal Winner 2", placeholderB: "QuarterFinal Winner 3" },
    { matchId: "F", date: "2026-07-30", day: 4, startTime: "13:30", endTime: "15:00", teamAName: "SF1 Winner", teamBName: "SF2 Winner", stage: "final", overs: 10, ground: "Ground 1", status: "scheduled", order: 18, placeholderA: "SF1 Winner", placeholderB: "SF2 Winner" },
  ];

  const fixtures: Fixture[] = fixtureDefs.map((f) => ({
    ...f,
    id: slugify(f.matchId),
    teamAId: f.placeholderA ? "" : resolveTeam(f.teamAName),
    teamBId: f.placeholderB ? "" : resolveTeam(f.teamBName),
  }));

  const settings: TournamentSettings = {
    id: "tournament",
    name: "CCPL 2026",
    startDate: "2026-07-27",
    endDate: "2026-07-30",
    venue: "Cisco Cricket Ground, Bengaluru",
    venueMapUrl: "https://maps.app.goo.gl/BaCMbG6re36ChLsi6",
    rules: [
      "Mon 27 · Tue 28: Round 1 (9 matches) + Round 2 (2 matches) · 6 overs per side",
      "Round 2: R1-9 winner vs best Round 1 loser (highest NRR); R1-8 winner vs R1-7 winner",
      "Wed 29: Quarter-Finals · Seeds 1v8, 2v7, 3v6, 4v5 · 8 overs per side",
      "Thu 30: Semi-Finals (10 overs) + Final at 1:30 PM (10 overs)",
      "Standings: Points → NRR → Runs Scored · Top 8 qualify for knockouts",
      "Powerplay: First 2 overs · Points: Win = 2, Tie/NR = 1, Loss = 0",
    ],
    officials: [
      { name: "Tournament Director", role: "Director" },
      { name: "Head Umpire", role: "Umpire" },
      { name: "Scoring Coordinator", role: "Scorer Lead" },
    ],
    volunteers: [
      { name: "Registration Desk", role: "Registration" },
      { name: "Ground Staff", role: "Ground Operations" },
    ],
    emergencyContacts: [
      { name: "Tournament Hotline", phone: "+91-XXXXXXXXXX" },
      { name: "Medical Support", phone: "+91-XXXXXXXXXX" },
    ],
    sponsors: [
      { name: "Cisco", url: "https://www.cisco.com" },
      { name: "CCPL 2026", url: "#" },
    ],
    pointsWin: 2,
    pointsTie: 1,
    pointsNr: 1,
    currentStage: "round_1" as MatchStage,
  };

  const announcements: Announcement[] = [
    {
      id: generateId("ann"),
      title: "Welcome to CCPL 2026!",
      body: "Cisco Champions Premier League begins July 27, 2026. Follow live scores, standings, and stats on CCPL Scoring Pro.",
      priority: "high",
      publishedAt: now,
    },
    {
      id: generateId("ann"),
      title: "Scorer Registration Open",
      body: "Volunteer scorers can sign in with Google and request scorer access from the admin panel.",
      priority: "normal",
      publishedAt: now,
    },
  ];

  return { teams, players, fixtures, settings, announcements };
}

export const DEMO_DATA = buildSeedData();
