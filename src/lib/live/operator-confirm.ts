/** Standard operator confirmation for destructive or irreversible scoring actions. */
export async function confirmOperatorAction(
  title: string,
  detail?: string
): Promise<boolean> {
  if (typeof window === "undefined") return true;
  const message = detail ? `${title}\n\n${detail}` : title;
  return window.confirm(message);
}

export const CONFIRM = {
  startMatch: (teams: string) =>
    confirmOperatorAction(
      "Start live scoring for this match?",
      `${teams}\n\nThis creates match and innings documents in Firestore.`
    ),
  endInnings: (inningsNumber: number) =>
    confirmOperatorAction(
      `End innings ${inningsNumber}?`,
      inningsNumber === 1
        ? "Second innings will begin. Verify the score is correct before continuing."
        : "The chase will be marked complete. You may need to finalize the match next."
    ),
  finalizeMatch: () =>
    confirmOperatorAction(
      "Finalize this match?",
      "This locks the result, updates standings, leaderboards, and knockout fixtures. This cannot be undone from the scorer."
    ),
  undoBall: (label: string) =>
    confirmOperatorAction(
      "Undo last ball?",
      `This removes ${label} and recalculates the scorecard.`
    ),
  restoreOver: (over: number, ball: number, removing: number) =>
    confirmOperatorAction(
      `Restore score to over ${over}.${ball}?`,
      `This permanently deletes ${removing} delivery${removing === 1 ? "" : "ies"} after that point.`
    ),
  editBall: (label: string) =>
    confirmOperatorAction(
      "Correct this delivery?",
      `${label}\n\nAn audit entry will be recorded with your reason.`
    ),
  takeOverScoring: (holder?: string) =>
    confirmOperatorAction(
      "Take over as active scorer?",
      holder
        ? `${holder} is currently scoring. You will become the only active scorer.`
        : "You will become the only active scorer for this match."
    ),
  tournamentReset: () =>
    confirmOperatorAction(
      "Re-seed tournament database?",
      "This resets teams, players, and fixtures from seed data. Live match data is NOT deleted but may become inconsistent."
    ),
} as const;
