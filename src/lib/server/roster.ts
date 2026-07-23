import type { Firestore } from "firebase-admin/firestore";
import type { Player, Team } from "@/types";
import { slugify } from "@/lib/utils";

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

export function buildPlayerRecord(
  team: Team,
  name: string,
  options?: { email?: string | null; isCaptain?: boolean }
): Player {
  const now = new Date().toISOString();
  const trimmedName = name.trim();
  const playerId = slugify(`${team.name}-${trimmedName}`);

  return {
    id: playerId,
    name: trimmedName,
    email: options?.email || undefined,
    teamId: team.id,
    role: options?.isCaptain ? "all_rounder" : "batsman",
    battingStyle: "right_hand",
    bowlingStyle: "right_arm_fast",
    isCaptain: options?.isCaptain ?? false,
    stats: emptyPlayerStats(),
    awards: [],
    createdAt: now,
    updatedAt: now,
  };
}

export async function getTeamOrThrow(db: Firestore, teamId: string): Promise<Team> {
  const snap = await db.collection("teams").doc(teamId).get();
  if (!snap.exists) {
    throw new Error("Team not found");
  }
  return { id: snap.id, ...snap.data() } as Team;
}

export async function addPlayerToTeam(
  db: Firestore,
  teamId: string,
  name: string,
  email?: string | null
): Promise<{ player: Player; team: Team }> {
  const team = await getTeamOrThrow(db, teamId);
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error("Player name is required");
  }

  const player = buildPlayerRecord(team, trimmedName, {
    email,
    isCaptain: team.captainId === slugify(`${team.name}-${trimmedName}`),
  });

  const existing = await db.collection("players").doc(player.id).get();
  if (existing.exists && existing.data()?.teamId !== teamId) {
    throw new Error("A player with this name already exists on another team");
  }

  const playerIds = Array.from(new Set([...(team.playerIds || []), player.id]));
  const now = new Date().toISOString();

  const batch = db.batch();
  batch.set(db.collection("players").doc(player.id), player);
  batch.set(
    db.collection("teams").doc(teamId),
    { playerIds, updatedAt: now },
    { merge: true }
  );
  await batch.commit();

  return {
    player,
    team: { ...team, playerIds, updatedAt: now },
  };
}

export async function removePlayerFromTeam(
  db: Firestore,
  teamId: string,
  playerId: string
): Promise<{ team: Team }> {
  const team = await getTeamOrThrow(db, teamId);
  const playerSnap = await db.collection("players").doc(playerId).get();

  if (!playerSnap.exists) {
    throw new Error("Player not found");
  }

  const player = { id: playerSnap.id, ...playerSnap.data() } as Player;
  if (player.teamId !== teamId) {
    throw new Error("Player is not on this team");
  }

  if (team.captainId === playerId) {
    throw new Error("Cannot remove the team captain. Change captain first.");
  }

  const playerIds = (team.playerIds || []).filter((id) => id !== playerId);
  const now = new Date().toISOString();
  const batch = db.batch();

  batch.delete(db.collection("players").doc(playerId));
  batch.set(
    db.collection("teams").doc(teamId),
    { playerIds, updatedAt: now },
    { merge: true }
  );
  await batch.commit();

  return {
    team: { ...team, playerIds, updatedAt: now },
  };
}

export async function listTeamPlayers(db: Firestore, teamId: string): Promise<Player[]> {
  const team = await getTeamOrThrow(db, teamId);
  const snaps = await db.collection("players").where("teamId", "==", teamId).get();
  const byId = new Map(
    snaps.docs.map((doc) => [doc.id, { id: doc.id, ...doc.data() } as Player])
  );

  const ordered = (team.playerIds || [])
    .map((id) => byId.get(id))
    .filter((player): player is Player => Boolean(player));

  for (const player of byId.values()) {
    if (!ordered.some((p) => p.id === player.id)) {
      ordered.push(player);
    }
  }

  return ordered;
}
