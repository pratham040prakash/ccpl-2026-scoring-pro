import type { Fixture } from "@/types";

/** Firestore match document ID (may differ from fixture.id when matchDocId is set). */
export function resolveMatchDocId(fixture: Pick<Fixture, "id" | "matchDocId"> | undefined): string {
  return fixture?.matchDocId ?? fixture?.id ?? "";
}
