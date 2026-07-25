import type { Match } from "@/types";

export function assertMatchWritable(match: Match, action = "modify this match"): void {
  if (match.locked) {
    throw new Error(`Match is locked. Cannot ${action}. Contact an administrator.`);
  }
  if (match.status === "completed" && match.result) {
    throw new Error(`Match is complete. Cannot ${action}.`);
  }
}
