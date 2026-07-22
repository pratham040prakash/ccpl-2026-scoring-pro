import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  orderBy,
  limit,
  type Unsubscribe,
} from "firebase/firestore";
import { getFirebaseDb, isFirebaseConfigured } from "./config";
import type {
  Announcement,
  Ball,
  BallAuditEntry,
  CommentaryEntry,
  Fixture,
  Innings,
  Match,
  Player,
  PointsTableEntry,
  Team,
  TournamentSettings,
  UserProfile,
  LeaderboardEntry,
} from "@/types";

const COL = {
  users: "users",
  teams: "teams",
  players: "players",
  fixtures: "fixtures",
  matches: "matches",
  innings: "innings",
  balls: "balls",
  commentary: "commentary",
  pointsTable: "pointsTable",
  leaderboards: "leaderboards",
  announcements: "announcements",
  settings: "settings",
  media: "media",
  ballAudit: "ballAudit",
  scoreboard: "scoreboard",
} as const;

function db() {
  return getFirebaseDb();
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  if (!isFirebaseConfigured()) return null;
  const snap = await getDoc(doc(db(), COL.users, uid));
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

export async function upsertUserProfile(profile: UserProfile): Promise<void> {
  await setDoc(doc(db(), COL.users, profile.uid), profile, { merge: true });
}

export async function getTeams(): Promise<Team[]> {
  if (!isFirebaseConfigured()) return [];
  const snap = await getDocs(query(collection(db(), COL.teams), orderBy("name")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Team);
}

export async function getTeam(id: string): Promise<Team | null> {
  if (!isFirebaseConfigured()) return null;
  const snap = await getDoc(doc(db(), COL.teams, id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Team) : null;
}

export async function getPlayers(teamId?: string): Promise<Player[]> {
  if (!isFirebaseConfigured()) return [];
  const q = teamId
    ? query(collection(db(), COL.players), where("teamId", "==", teamId))
    : query(collection(db(), COL.players));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Player);
}

export async function getFixtures(): Promise<Fixture[]> {
  if (!isFirebaseConfigured()) return [];
  const snap = await getDocs(query(collection(db(), COL.fixtures), orderBy("order")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Fixture);
}

export async function getMatches(status?: string): Promise<Match[]> {
  if (!isFirebaseConfigured()) return [];
  const q = status
    ? query(collection(db(), COL.matches), where("status", "==", status))
    : query(collection(db(), COL.matches), orderBy("date"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Match);
}

export async function getMatch(id: string): Promise<Match | null> {
  if (!isFirebaseConfigured()) return null;
  const snap = await getDoc(doc(db(), COL.matches, id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Match) : null;
}

export async function getMatchBySlug(slug: string): Promise<Match | null> {
  if (!isFirebaseConfigured()) return null;
  const snap = await getDocs(
    query(collection(db(), COL.matches), where("shareSlug", "==", slug), limit(1))
  );
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as Match;
}

export async function getInnings(matchId: string): Promise<Innings[]> {
  if (!isFirebaseConfigured()) return [];
  const snap = await getDocs(
    query(collection(db(), COL.innings), where("matchId", "==", matchId), orderBy("inningsNumber"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Innings);
}

export async function getBalls(inningsId: string): Promise<Ball[]> {
  if (!isFirebaseConfigured()) return [];
  const snap = await getDocs(
    query(collection(db(), COL.balls), where("inningsId", "==", inningsId), orderBy("sequence"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Ball);
}

export async function getCommentary(matchId: string): Promise<CommentaryEntry[]> {
  if (!isFirebaseConfigured()) return [];
  const snap = await getDocs(
    query(collection(db(), COL.commentary), where("matchId", "==", matchId), orderBy("timestamp", "desc"), limit(100))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as CommentaryEntry);
}

export async function getPointsTable(): Promise<PointsTableEntry[]> {
  if (!isFirebaseConfigured()) return [];
  const snap = await getDocs(query(collection(db(), COL.pointsTable), orderBy("rank")));
  return snap.docs.map((d) => d.data() as PointsTableEntry);
}

export async function getSettings(): Promise<TournamentSettings | null> {
  if (!isFirebaseConfigured()) return null;
  const snap = await getDoc(doc(db(), COL.settings, "tournament"));
  return snap.exists() ? (snap.data() as TournamentSettings) : null;
}

export async function getAnnouncements(): Promise<Announcement[]> {
  if (!isFirebaseConfigured()) return [];
  const snap = await getDocs(
    query(collection(db(), COL.announcements), orderBy("publishedAt", "desc"), limit(10))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Announcement);
}

export function subscribeToCommentary(
  matchId: string,
  callback: (entries: CommentaryEntry[]) => void
): Unsubscribe {
  if (!isFirebaseConfigured()) {
    callback([]);
    return () => {};
  }
  return onSnapshot(
    query(
      collection(db(), COL.commentary),
      where("matchId", "==", matchId),
      orderBy("timestamp", "desc"),
      limit(100)
    ),
    (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as CommentaryEntry));
    }
  );
}

export async function createMatchDoc(match: Match): Promise<void> {
  await setDoc(doc(db(), COL.matches, match.id), match);
}

export async function saveAuditEntry(entry: BallAuditEntry): Promise<void> {
  await setDoc(doc(db(), COL.ballAudit, entry.id), entry);
}

export async function getAuditLog(matchId: string): Promise<BallAuditEntry[]> {
  if (!isFirebaseConfigured()) return [];
  const snap = await getDocs(
    query(
      collection(db(), COL.ballAudit),
      where("matchId", "==", matchId),
      orderBy("timestamp", "desc"),
      limit(200)
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as BallAuditEntry);
}

export function subscribeToMatch(
  matchId: string,
  callback: (match: Match | null) => void
): Unsubscribe {
  if (!isFirebaseConfigured()) {
    callback(null);
    return () => {};
  }
  return onSnapshot(doc(db(), COL.matches, matchId), (snap) => {
    callback(snap.exists() ? ({ id: snap.id, ...snap.data() } as Match) : null);
  });
}

export function subscribeToInnings(
  matchId: string,
  callback: (innings: Innings[]) => void
): Unsubscribe {
  if (!isFirebaseConfigured()) {
    callback([]);
    return () => {};
  }
  return onSnapshot(
    query(collection(db(), COL.innings), where("matchId", "==", matchId), orderBy("inningsNumber")),
    (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Innings));
    }
  );
}

export function subscribeToBalls(
  inningsId: string,
  callback: (balls: Ball[]) => void
): Unsubscribe {
  if (!isFirebaseConfigured()) {
    callback([]);
    return () => {};
  }
  return onSnapshot(
    query(collection(db(), COL.balls), where("inningsId", "==", inningsId), orderBy("sequence")),
    (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Ball));
    }
  );
}

export async function updateMatch(id: string, data: Partial<Match>): Promise<void> {
  await updateDoc(doc(db(), COL.matches, id), { ...data, updatedAt: new Date().toISOString() });
}

export async function saveBall(ball: Ball): Promise<void> {
  await setDoc(doc(db(), COL.balls, ball.id), ball);
}

export async function deleteBall(ballId: string): Promise<void> {
  const { deleteDoc } = await import("firebase/firestore");
  await deleteDoc(doc(db(), COL.balls, ballId));
}

export async function saveInnings(innings: Innings): Promise<void> {
  await setDoc(doc(db(), COL.innings, innings.id), innings, { merge: true });
}

export async function saveCommentary(entry: CommentaryEntry): Promise<void> {
  await setDoc(doc(db(), COL.commentary, entry.id), entry);
}

export interface LiveNotificationDoc {
  id: string;
  matchId: string;
  type: string;
  title: string;
  body: string;
  timestamp: string;
  public?: boolean;
}

export function subscribeToLeaderboards(
  callback: (boards: Record<string, LeaderboardEntry[]>) => void
): Unsubscribe {
  if (!isFirebaseConfigured()) {
    callback({});
    return () => {};
  }
  return onSnapshot(collection(db(), COL.leaderboards), (snap) => {
    const map: Record<string, LeaderboardEntry[]> = {};
    for (const d of snap.docs) {
      const data = d.data() as { entries?: LeaderboardEntry[] };
      map[d.id] = data.entries ?? [];
    }
    callback(map);
  });
}

export function subscribeToNotifications(
  matchId: string,
  callback: (notes: LiveNotificationDoc[]) => void
): Unsubscribe {
  if (!isFirebaseConfigured()) {
    callback([]);
    return () => {};
  }
  let lastKey = "";
  return onSnapshot(
    query(
      collection(db(), "notifications"),
      where("matchId", "==", matchId),
      orderBy("timestamp", "desc"),
      limit(5)
    ),
    (snap) => {
      const notes = snap.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as LiveNotificationDoc
      );
      const key = notes[0]?.id ?? "";
      if (key && key !== lastKey) {
        lastKey = key;
        callback(notes);
      }
    }
  );
}

export { COL };
