import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Ball, Innings, Match, ScoringAction } from "@/types";

interface CCPLDB extends DBSchema {
  pendingActions: {
    key: string;
    value: PendingAction;
    indexes: { "by-match": string };
  };
  cachedMatches: {
    key: string;
    value: CachedMatch;
  };
  cachedInnings: {
    key: string;
    value: Innings;
    indexes: { "by-match": string };
  };
  cachedBalls: {
    key: string;
    value: Ball;
    indexes: { "by-match": string; "by-innings": string };
  };
}

export interface PendingAction {
  id: string;
  matchId: string;
  inningsId: string;
  action: ScoringAction;
  strikerId: string;
  strikerName: string;
  nonStrikerId: string;
  nonStrikerName: string;
  bowlerId: string;
  bowlerName: string;
  sequence: number;
  createdAt: string;
  synced: boolean;
}

interface CachedMatch {
  match: Match;
  updatedAt: string;
}

let dbPromise: Promise<IDBPDatabase<CCPLDB>> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<CCPLDB>("ccpl-scoring-pro", 1, {
      upgrade(db) {
        const actions = db.createObjectStore("pendingActions", { keyPath: "id" });
        actions.createIndex("by-match", "matchId");
        db.createObjectStore("cachedMatches", { keyPath: "match.id" });
        const innings = db.createObjectStore("cachedInnings", { keyPath: "id" });
        innings.createIndex("by-match", "matchId");
        const balls = db.createObjectStore("cachedBalls", { keyPath: "id" });
        balls.createIndex("by-match", "matchId");
        balls.createIndex("by-innings", "inningsId");
      },
    });
  }
  return dbPromise;
}

export async function queueOfflineAction(action: PendingAction): Promise<void> {
  const db = await getDb();
  await db.put("pendingActions", action);
}

export async function getPendingActions(matchId?: string): Promise<PendingAction[]> {
  const db = await getDb();
  if (matchId) {
    return db.getAllFromIndex("pendingActions", "by-match", matchId);
  }
  return db.getAll("pendingActions");
}

export async function markActionSynced(id: string): Promise<void> {
  const db = await getDb();
  await db.delete("pendingActions", id);
}

export async function cacheMatch(match: Match): Promise<void> {
  const db = await getDb();
  await db.put("cachedMatches", { match, updatedAt: new Date().toISOString() });
}

export async function getCachedMatch(matchId: string): Promise<Match | null> {
  const db = await getDb();
  const cached = await db.get("cachedMatches", matchId);
  return cached?.match ?? null;
}

export async function cacheInnings(innings: Innings): Promise<void> {
  const db = await getDb();
  await db.put("cachedInnings", innings);
}

export async function getCachedInnings(matchId: string): Promise<Innings[]> {
  const db = await getDb();
  return db.getAllFromIndex("cachedInnings", "by-match", matchId);
}

export async function cacheBall(ball: Ball): Promise<void> {
  const db = await getDb();
  await db.put("cachedBalls", ball);
}

export async function getCachedBalls(inningsId: string): Promise<Ball[]> {
  const db = await getDb();
  return db.getAllFromIndex("cachedBalls", "by-innings", inningsId);
}

export async function isOnline(): Promise<boolean> {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}
