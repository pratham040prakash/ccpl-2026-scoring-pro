export interface StoredMatchScore {
  fixtureId: string;
  matchId: string;
  teamAId: string;
  teamBId: string;
  teamAName: string;
  teamBName: string;
  teamARuns: number;
  teamAWickets: number;
  teamAOvers: number;
  teamABalls: number;
  teamBRuns: number;
  teamBWickets: number;
  teamBOvers: number;
  teamBBalls: number;
  winnerName: string;
  winnerId: string;
  margin: string;
  marginType: "runs" | "wickets";
  status: "completed" | "published";
  source: "csv" | "image" | "manual" | "scorer" | "live";
  updatedAt: string;
}

export interface ScoreImportRow {
  matchId: string;
  teamARuns: number;
  teamAWickets: number;
  teamAOvers: number;
  teamABalls: number;
  teamBRuns: number;
  teamBWickets: number;
  teamBOvers: number;
  teamBBalls: number;
  winnerName: string;
  margin: string;
  errors: string[];
}

export interface ParsedScoreImage {
  rawText: string;
  teamAScore?: { runs: number; wickets: number };
  teamBScore?: { runs: number; wickets: number };
  detectedMatchId?: string;
  confidence: "high" | "medium" | "low";
}
