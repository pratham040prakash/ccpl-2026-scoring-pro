import type { Ball, Innings, Match, PointsTableEntry, Team } from "@/types";
import { calculatePointsTable } from "@/lib/engine/tournament";
import {
  aggregatePlayerStatsFromBalls,
  computeMatchResult,
  generateMatchSummary,
  resolvePlayerOfMatchFromBalls,
} from "@/lib/engine/match-finalization";
import { calculateLeaderboards } from "@/lib/engine/statistics";
import { buildSeedData } from "@/lib/seed";
import type { Firestore } from "firebase-admin/firestore";

export interface FinalizeMatchResult {
  result: ReturnType<typeof computeMatchResult>["result"];
  playerOfMatchId?: string;
  summary: string;
  pointsTableCount: number;
  leaderboardCategories: string[];
}

export async function finalizeMatchOnServer(
  db: Firestore,
  matchId: string
): Promise<FinalizeMatchResult> {
  const matchSnap = await db.collection("matches").doc(matchId).get();
  if (!matchSnap.exists) throw new Error("Match not found");
  const match = { id: matchSnap.id, ...matchSnap.data() } as Match;

  const inningsSnap = await db
    .collection("innings")
    .where("matchId", "==", matchId)
    .orderBy("inningsNumber")
    .get();

  const inningsList = inningsSnap.docs.map(
    (d) => ({ id: d.id, ...d.data() }) as Innings
  );

  if (inningsList.length < 2) {
    throw new Error("Match needs two completed innings to finalize");
  }

  const { result, winnerId, loserId } = computeMatchResult(match, inningsList);

  const allBalls: Ball[] = [];
  for (const inn of inningsList) {
    const ballsSnap = await db
      .collection("balls")
      .where("inningsId", "==", inn.id)
      .get();
    allBalls.push(...ballsSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Ball));
  }

  const mom = resolvePlayerOfMatchFromBalls(allBalls);
  const summary = generateMatchSummary(match, inningsList, mom);
  const now = new Date().toISOString();

  await db.collection("matches").doc(matchId).set(
    {
      status: "completed",
      result,
      playerOfMatchId: mom?.playerId ?? null,
      locked: true,
      published: true,
      summary,
      updatedAt: now,
    },
    { merge: true }
  );

  const fixtureRef = db.collection("fixtures").doc(match.fixtureId);
  const fixtureSnap = await fixtureRef.get();
  if (fixtureSnap.exists) {
    await fixtureRef.set(
      {
        status: "completed",
        winnerId,
        loserId,
        updatedAt: now,
      },
      { merge: true }
    );
  }

  await syncTournamentStandings(db);
  await syncLeaderboards(db);
  await writeMatchNotifications(db, match, result, mom, summary);

  return {
    result,
    playerOfMatchId: mom?.playerId,
    summary,
    pointsTableCount: (await db.collection("pointsTable").get()).size,
    leaderboardCategories: (await db.collection("leaderboards").get()).docs.map((d) => d.id),
  };
}

async function syncTournamentStandings(db: Firestore): Promise<void> {
  const { teams } = buildSeedData();
  const teamsSnap = await db.collection("teams").get();
  const firestoreTeams: Team[] = teamsSnap.empty
    ? teams
    : teamsSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Team);

  const matchesSnap = await db.collection("matches").get();
  const matches = matchesSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as Match)
    .filter((m) =>
      ["completed", "locked", "published"].includes(m.status)
    );

  const inningsMap: Record<string, Innings[]> = {};
  for (const m of matches) {
    const innSnap = await db.collection("innings").where("matchId", "==", m.id).get();
    inningsMap[m.id] = innSnap.docs.map(
      (d) => ({ id: d.id, ...d.data() }) as Innings
    );
  }

  const settingsSnap = await db.collection("settings").doc("tournament").get();
  const settings = settingsSnap.data() ?? { pointsWin: 2, pointsTie: 1, pointsNr: 1 };

  const table: PointsTableEntry[] = calculatePointsTable(
    firestoreTeams,
    matches,
    inningsMap,
    {
      pointsWin: settings.pointsWin ?? 2,
      pointsTie: settings.pointsTie ?? 1,
      pointsNr: settings.pointsNr ?? 1,
    }
  );

  const batch = db.batch();
  for (const entry of table) {
    batch.set(db.collection("pointsTable").doc(entry.teamId), {
      ...entry,
      updatedAt: new Date().toISOString(),
    });
  }
  await batch.commit();
}

async function syncLeaderboards(db: Firestore): Promise<void> {
  const ballsSnap = await db.collection("balls").get();
  const allBalls = ballsSnap.docs.map(
    (d) => ({ id: d.id, ...d.data() }) as Ball
  );

  const { teams, players } = buildSeedData();
  const teamNameByPlayer = new Map<
    string,
    { teamId: string; teamName: string }
  >();
  for (const p of players) {
    const team = teams.find((t) => t.id === p.teamId);
    teamNameByPlayer.set(p.id, {
      teamId: p.teamId,
      teamName: team?.name ?? "",
    });
  }

  for (const ball of allBalls) {
    if (!teamNameByPlayer.has(ball.strikerId)) {
      teamNameByPlayer.set(ball.strikerId, {
        teamId: "",
        teamName: ball.strikerName,
      });
    }
    if (!teamNameByPlayer.has(ball.bowlerId)) {
      teamNameByPlayer.set(ball.bowlerId, {
        teamId: "",
        teamName: ball.bowlerName,
      });
    }
  }

  const playerStats = aggregatePlayerStatsFromBalls(allBalls, teamNameByPlayer);
  const boards = calculateLeaderboards(playerStats);
  const now = new Date().toISOString();

  const batch = db.batch();
  for (const [category, entries] of Object.entries(boards)) {
    batch.set(db.collection("leaderboards").doc(category), {
      category,
      entries,
      updatedAt: now,
    });
  }
  await batch.commit();
}

async function writeMatchNotifications(
  db: Firestore,
  match: Match,
  result: ReturnType<typeof computeMatchResult>["result"],
  mom: { playerId: string; playerName: string; reason: string } | null,
  summary: string
): Promise<void> {
  const now = new Date().toISOString();
  const batch = db.batch();

  batch.set(db.collection("notifications").doc(`${match.id}_complete`), {
    matchId: match.id,
    type: "match_complete",
    title: "Match Finished",
    body: result.summary,
    timestamp: now,
    public: true,
  });

  if (mom) {
    batch.set(db.collection("notifications").doc(`${match.id}_mom`), {
      matchId: match.id,
      type: "player_of_match",
      title: "Player of the Match",
      body: `${mom.playerName} — ${mom.reason}`,
      timestamp: now,
      public: true,
    });
  }

  batch.set(db.collection("announcements").doc(`result_${match.id}`), {
    title: `${match.matchId} Result`,
    body: summary,
    priority: "high",
    publishedAt: now,
  });

  await batch.commit();
}

export async function writeLiveEventNotification(
  db: Firestore,
  matchId: string,
  type: string,
  title: string,
  body: string
): Promise<void> {
  const id = `${matchId}_${type}_${Date.now()}`;
  await db.collection("notifications").doc(id).set({
    matchId,
    type,
    title,
    body,
    timestamp: new Date().toISOString(),
    public: true,
  });
}
