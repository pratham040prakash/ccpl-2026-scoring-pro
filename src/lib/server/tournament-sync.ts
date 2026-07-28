import type { Ball, Fixture, Innings, Match, Player, Team } from "@/types";
import {
  deriveCurrentStage,
  applyQuarterFinalSeeding,
  resolveKnockoutTeams,
} from "@/lib/engine/tournament";
import {
  aggregatePlayerStatsFromBalls,
  computeMatchResult,
  generateMatchSummary,
  resolvePlayerOfMatchFromBalls,
} from "@/lib/engine/match-finalization";
import { calculateLeaderboards } from "@/lib/engine/statistics";
import { buildSeedData } from "@/lib/seed";
import { applyConfirmedRound2Fixtures } from "@/data/round2-assignments";
import { buildMatchesFromScores } from "@/lib/scores/fixture-resolution";
import { buildUnifiedStandingsFromFirestore, syncUnifiedStandingsToFirestore } from "@/lib/server/standings-publish";
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
  await syncKnockoutFixtures(db);
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
  await syncUnifiedStandingsToFirestore(db);
}

async function syncKnockoutFixtures(db: Firestore): Promise<number> {
  return (await syncKnockoutFixturesToFirestore(db)).updated;
}

export async function syncKnockoutFixturesToFirestore(
  db: Firestore
): Promise<{
  updated: number;
  round2: Array<{ matchId: string; teamAName: string; teamBName: string }>;
  quarterFinals: Array<{ matchId: string; teamAName: string; teamBName: string }>;
}> {
  const seed = buildSeedData();
  const [fixturesSnap, matchesSnap, teamsSnap] = await Promise.all([
    db.collection("fixtures").get(),
    db.collection("matches").get(),
    db.collection("teams").get(),
  ]);

  const fixtures = fixturesSnap.empty
    ? seed.fixtures
    : fixturesSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Fixture);
  const firestoreMatches = matchesSnap.docs.map(
    (d) => ({ id: d.id, ...d.data() }) as Match
  );
  const teams = teamsSnap.empty
    ? seed.teams
    : teamsSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Team);

  const { table, scores } = await buildUnifiedStandingsFromFirestore(db);
  const scoreMatches = buildMatchesFromScores(fixtures, scores);
  const matchByFixture = new Map<string, Match>();
  for (const match of scoreMatches) matchByFixture.set(match.fixtureId, match);
  for (const match of firestoreMatches) {
    if (match.result?.winnerId) matchByFixture.set(match.fixtureId, match);
  }
  const matches = Array.from(matchByFixture.values());

  const resolved = applyQuarterFinalSeeding(
    applyConfirmedRound2Fixtures(resolveKnockoutTeams(fixtures, matches, table, teams)),
    table,
    teams
  );
  const now = new Date().toISOString();
  const batch = db.batch();
  let updated = 0;

  for (const fixture of resolved) {
    const original = fixtures.find((f) => f.id === fixture.id);
    if (!original) continue;

    const idsReady = Boolean(fixture.teamAId?.trim() && fixture.teamBId?.trim());
    const idsChanged =
      fixture.teamAId !== original.teamAId || fixture.teamBId !== original.teamBId;
    const namesChanged =
      fixture.teamAName !== original.teamAName || fixture.teamBName !== original.teamBName;

    if (idsReady && (idsChanged || namesChanged)) {
      batch.set(
        db.collection("fixtures").doc(fixture.id),
        {
          teamAId: fixture.teamAId,
          teamBId: fixture.teamBId,
          teamAName: fixture.teamAName,
          teamBName: fixture.teamBName,
          updatedAt: now,
        },
        { merge: true }
      );
      updated += 1;
    }
  }

  batch.set(
    db.collection("settings").doc("tournament"),
    { currentStage: deriveCurrentStage(resolved), updatedAt: now },
    { merge: true }
  );

  await batch.commit();

  const round2 = resolved
    .filter((fixture) => fixture.stage === "integration")
    .map((fixture) => ({
      matchId: fixture.matchId,
      teamAName: fixture.teamAName,
      teamBName: fixture.teamBName,
    }));

  const quarterFinals = resolved
    .filter((fixture) => fixture.stage === "quarter_final")
    .map((fixture) => ({
      matchId: fixture.matchId,
      teamAName: fixture.teamAName,
      teamBName: fixture.teamBName,
    }));

  return { updated, round2, quarterFinals };
}

async function syncLeaderboards(db: Firestore): Promise<void> {
  const ballsSnap = await db.collection("balls").get();
  const allBalls = ballsSnap.docs.map(
    (d) => ({ id: d.id, ...d.data() }) as Ball
  );

  const { teams } = buildSeedData();
  const [teamsSnap, playersSnap] = await Promise.all([
    db.collection("teams").get(),
    db.collection("players").get(),
  ]);

  const firestoreTeams: Team[] = teamsSnap.empty
    ? teams
    : teamsSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Team);
  const firestorePlayers: Player[] = playersSnap.empty
    ? buildSeedData().players
    : playersSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Player);

  const teamNameByPlayer = new Map<
    string,
    { teamId: string; teamName: string }
  >();
  for (const p of firestorePlayers) {
    const team = firestoreTeams.find((t) => t.id === p.teamId);
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
