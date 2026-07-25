export type ScoringLogEvent =
  | "score_submitted"
  | "firestore_write"
  | "firestore_read"
  | "realtime_update"
  | "undo"
  | "restore"
  | "edit"
  | "sync"
  | "finalize"
  | "error";

export interface ScoringLogEntry {
  ts: string;
  event: ScoringLogEvent;
  message: string;
  meta?: Record<string, unknown>;
}

const MAX = 200;
const buffer: ScoringLogEntry[] = [];
const listeners = new Set<(entries: ScoringLogEntry[]) => void>();

export function logScoring(
  event: ScoringLogEvent,
  message: string,
  meta?: Record<string, unknown>
): void {
  const entry: ScoringLogEntry = {
    ts: new Date().toISOString(),
    event,
    message,
    meta,
  };
  buffer.unshift(entry);
  if (buffer.length > MAX) buffer.length = MAX;
  listeners.forEach((fn) => fn([...buffer]));
  if (process.env.NODE_ENV !== "production") {
    console.info(`[ccpl-scoring:${event}]`, message, meta ?? "");
  }
}

export function getScoringLogs(): ScoringLogEntry[] {
  return [...buffer];
}

export function subscribeScoringLogs(fn: (entries: ScoringLogEntry[]) => void): () => void {
  listeners.add(fn);
  fn([...buffer]);
  return () => listeners.delete(fn);
}
