import type { ParsedScoreImage } from "@/types/scores";

const SCORE_PATTERN = /(\d{1,3})\s*\/\s*(\d{1,2})/g;
const MATCH_ID_PATTERN = /\b(R[12]?-\d+|QF\d+|SF\d+|F)\b/i;

export async function parseScoreImageFile(file: File): Promise<ParsedScoreImage> {
  const Tesseract = await import("tesseract.js");
  const result = await Tesseract.recognize(file, "eng", {
    logger: () => {},
  });

  const rawText = result.data.text;
  return parseScoreText(rawText);
}

export function parseScoreText(rawText: string): ParsedScoreImage {
  const scores: { runs: number; wickets: number }[] = [];
  let match: RegExpExecArray | null;
  const regex = new RegExp(SCORE_PATTERN.source, "g");

  while ((match = regex.exec(rawText)) !== null) {
    const runs = parseInt(match[1], 10);
    const wickets = parseInt(match[2], 10);
    if (wickets <= 10 && runs <= 300) {
      scores.push({ runs, wickets });
    }
  }

  const matchIdMatch = rawText.match(MATCH_ID_PATTERN);
  const detectedMatchId = matchIdMatch?.[1]?.toUpperCase();

  let confidence: ParsedScoreImage["confidence"] = "low";
  if (scores.length >= 2 && detectedMatchId) confidence = "high";
  else if (scores.length >= 2) confidence = "medium";
  else if (scores.length === 1) confidence = "low";

  return {
    rawText,
    teamAScore: scores[0],
    teamBScore: scores[1],
    detectedMatchId,
    confidence,
  };
}
