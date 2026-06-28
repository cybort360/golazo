import type { Match } from "@/lib/predict/types";

export function matchStateLabel(match: Match): string {
  switch (match.state) {
    case "LIVE":
      return match.minute !== null ? `LIVE ${match.minute}'` : "LIVE";
    case "HT": return "HT";
    case "FT": return "FT";
    case "SUSPENDED": return "SUSPENDED";
    case "POSTPONED": return "POSTPONED";
    case "VOID": return "VOID";
    case "NOT_STARTED": return "";
  }
}

export function scoreLabel(match: Match): string {
  if (match.homeScore === null || match.awayScore === null) return "";
  return `${match.homeScore} – ${match.awayScore}`;
}

export function formatPoints(n: number): string {
  return n.toLocaleString("en-US");
}

export function formatAccuracy(frac: number): string {
  return `${Math.round(frac * 100)}%`;
}
