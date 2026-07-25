import type { User } from "firebase/auth";
import type { ScoringUser } from "@/lib/engine/live-scoring-service";

export async function buildScoringUser(user: User | null | undefined): Promise<ScoringUser | undefined> {
  if (!user) return undefined;
  return {
    uid: user.uid,
    email: user.email ?? undefined,
    idToken: await user.getIdToken(),
  };
}
