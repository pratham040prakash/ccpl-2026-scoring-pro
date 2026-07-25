import type { Ball, Innings, Match } from "@/types";

export interface RecoveryCheckpoint {
  matchId: string;
  inningsId: string;
  match: Match;
  innings: Innings;
  ballCount: number;
  lastSequence: number;
  savedAt: string;
  savedBy?: string;
}

const PREFIX = "ccpl-recovery:";

export function saveRecoveryCheckpoint(
  match: Match,
  innings: Innings,
  balls: Ball[],
  savedBy?: string
): void {
  if (typeof window === "undefined") return;
  const checkpoint: RecoveryCheckpoint = {
    matchId: match.id,
    inningsId: innings.id,
    match,
    innings,
    ballCount: balls.length,
    lastSequence: balls.at(-1)?.sequence ?? -1,
    savedAt: new Date().toISOString(),
    savedBy,
  };
  try {
    localStorage.setItem(`${PREFIX}${match.id}`, JSON.stringify(checkpoint));
  } catch {
    // Storage full — non-fatal
  }
}

export function loadRecoveryCheckpoint(matchId: string): RecoveryCheckpoint | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`${PREFIX}${matchId}`);
    if (!raw) return null;
    return JSON.parse(raw) as RecoveryCheckpoint;
  } catch {
    return null;
  }
}

export function clearRecoveryCheckpoint(matchId: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(`${PREFIX}${matchId}`);
}

export function isCheckpointNewer(
  checkpoint: RecoveryCheckpoint,
  innings?: Innings | null,
  ballCount = 0
): boolean {
  if (!innings) return true;
  const remoteTime = new Date(innings.updatedAt ?? 0).getTime();
  const localTime = new Date(checkpoint.savedAt).getTime();
  return localTime > remoteTime || checkpoint.ballCount > ballCount;
}
