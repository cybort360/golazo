// Pure helpers for the shareable cards: the X (Twitter) intent URL builder and
// the data each card needs, derived from the leaderboards. Kept dependency-light
// so they're unit-testable; the image rendering lives in the /s OG routes.

import type { Leaderboards } from "@/lib/predictions";

/** Open-a-tweet intent URL with prefilled text + the share link to unfurl. */
export function buildTweetIntent(text: string, url: string): string {
  const params = new URLSearchParams({ text, url });
  return `https://x.com/intent/tweet?${params.toString()}`;
}

export interface PredictorCard {
  nickname: string;
  rank: number;
  correct: number;
  played: number;
  scope: "week" | "season";
}

/**
 * The predictor's best standing to show: their current-week rank if they've
 * played this week, otherwise their season rank. Null if the nickname isn't on
 * the board at all (→ generic card).
 */
export function predictorCardData(
  lb: Leaderboards,
  weekKey: string,
  nickname: string,
): PredictorCard | null {
  const norm = nickname.toLowerCase();

  const weekRows = lb.weeks[weekKey] ?? [];
  const wi = weekRows.findIndex((r) => r.nickname.toLowerCase() === norm);
  if (wi >= 0) {
    const r = weekRows[wi];
    return {
      nickname: r.nickname,
      rank: wi + 1,
      correct: r.correct,
      played: r.played,
      scope: "week",
    };
  }

  const si = lb.season.findIndex((r) => r.nickname.toLowerCase() === norm);
  if (si >= 0) {
    const r = lb.season[si];
    return {
      nickname: r.nickname,
      rank: si + 1,
      correct: r.correct,
      played: r.played,
      scope: "season",
    };
  }

  return null;
}

/** True when the nickname currently tops the given week's board. */
export function isWeekWinner(
  lb: Leaderboards,
  weekKey: string,
  nickname: string,
): boolean {
  const rows = lb.weeks[weekKey] ?? [];
  return (
    rows.length > 0 &&
    rows[0].played > 0 &&
    rows[0].nickname.toLowerCase() === nickname.toLowerCase()
  );
}
