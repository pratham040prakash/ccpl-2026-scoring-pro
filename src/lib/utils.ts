import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function formatOvers(overs: number, balls: number): string {
  return `${overs}.${balls}`;
}

export function parseOvers(oversStr: string): { overs: number; balls: number } {
  const [o, b] = oversStr.split(".").map(Number);
  return { overs: o || 0, balls: b || 0 };
}

export function totalBalls(overs: number, balls: number): number {
  return overs * 6 + balls;
}

export function ballsToOvers(total: number): { overs: number; balls: number } {
  return { overs: Math.floor(total / 6), balls: total % 6 };
}

export function calculateRunRate(runs: number, overs: number, balls: number): number {
  const total = totalBalls(overs, balls);
  if (total === 0) return 0;
  return (runs / total) * 6;
}

export function calculateRequiredRunRate(
  target: number,
  currentRuns: number,
  maxOvers: number,
  currentOvers: number,
  currentBalls: number
): number {
  const remaining = target - currentRuns;
  const ballsLeft = maxOvers * 6 - totalBalls(currentOvers, currentBalls);
  if (ballsLeft <= 0 || remaining <= 0) return 0;
  return (remaining / ballsLeft) * 6;
}

export function calculateNRR(
  runsFor: number,
  oversFor: number,
  runsAgainst: number,
  oversAgainst: number
): number {
  if (oversFor === 0 || oversAgainst === 0) return 0;
  return runsFor / oversFor - runsAgainst / oversAgainst;
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatTime(timeStr: string): string {
  const [h, m] = timeStr.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

export function getShareUrl(matchId: string, slug: string): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/live/${slug || matchId}`;
  }
  return `/live/${slug || matchId}`;
}

export function getWhatsAppShareUrl(text: string, url: string): string {
  return `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`;
}

export function getTeamsShareUrl(text: string, url: string): string {
  return `https://teams.microsoft.com/share?href=${encodeURIComponent(url)}&msgText=${encodeURIComponent(text)}`;
}

export function getEmailShareUrl(subject: string, body: string): string {
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function generateId(prefix = ""): string {
  const id = crypto.randomUUID().slice(0, 8);
  return prefix ? `${prefix}_${id}` : id;
}

export function strikeRate(runs: number, balls: number): number {
  if (balls === 0) return 0;
  return Math.round((runs / balls) * 1000) / 10;
}

export function economy(runs: number, balls: number): number {
  if (balls === 0) return 0;
  return Math.round((runs / balls) * 60 * 10) / 10;
}
