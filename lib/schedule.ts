// Utility functions for working with the FIFA 2026 match schedule.
// SSR-safe: the only "current time" source is new Date(). No window, no localStorage.

import { SCHEDULE, type ScheduledMatch } from "@/constants/schedule";

export interface MatchResult {
  matchId: string;
  winner: string;
  loser: string;
  isDraw: boolean;
}

// All kickoff times in SCHEDULE are expressed in US Eastern Time.
const ET_TIME_ZONE = "America/New_York";

// A match is considered "live" for this long after kickoff.
const LIVE_WINDOW_MS = 2 * 60 * 60 * 1000;

const MS_PER_MINUTE = 60_000;

/**
 * Today's date as YYYY-MM-DD in US Eastern Time — the time zone every kickoff
 * (and therefore every `match.date`) is expressed in. Using UTC here is wrong:
 * a late ET match (e.g. "22:00 ET") still carries its ET calendar date, so near
 * the UTC/ET boundary a UTC "today" would either surface the next day's
 * fixtures early or hide an ET match that is still in progress. en-CA formats
 * as YYYY-MM-DD, which sorts/compares directly against `match.date`.
 */
function todayEt(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ET_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Minutes-since-midnight for a "HH:MM ET" time string. */
function timeToMinutes(time: string): number {
  const match = /^(\d{1,2}):(\d{2})/.exec(time);
  if (!match) return 0;
  return Number(match[1]) * 60 + Number(match[2]);
}

/** Chronological comparator on date then time. */
function compareByDateTime(a: ScheduledMatch, b: ScheduledMatch): number {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1;
  return timeToMinutes(a.time) - timeToMinutes(b.time);
}

/**
 * Offset (ms) between the given time zone's wall clock and UTC at `instant`,
 * i.e. wallClock - UTC. For US Eastern this is -4h (EDT) or -5h (EST).
 * Uses Intl so it stays correct across DST transitions, server or client.
 */
function zoneOffsetMs(instant: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  });
  const parts = dtf.formatToParts(instant);
  const get = (type: string): number => {
    const part = parts.find((p) => p.type === type);
    return part ? Number(part.value) : 0;
  };
  let hour = get("hour");
  if (hour === 24) hour = 0; // some runtimes report midnight as 24
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    hour,
    get("minute"),
    get("second"),
  );
  return asUtc - instant.getTime();
}

/** Convert a match's ET date+time into a real UTC instant. */
function kickoffUtc(match: ScheduledMatch): Date {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(match.date);
  const minutes = timeToMinutes(match.time);
  const year = dateMatch ? Number(dateMatch[1]) : 1970;
  const month = dateMatch ? Number(dateMatch[2]) : 1;
  const day = dateMatch ? Number(dateMatch[3]) : 1;

  // Interpret the wall-clock components as UTC first, then shift by the real
  // ET offset (sampled at that instant, stable except across a DST boundary).
  const wallAsUtc = Date.UTC(year, month - 1, day, Math.floor(minutes / 60), minutes % 60, 0);
  const offset = zoneOffsetMs(new Date(wallAsUtc), ET_TIME_ZONE);
  return new Date(wallAsUtc - offset);
}

/** A match's kickoff as a UTC epoch (ms). */
export function getKickoffMs(match: ScheduledMatch): number {
  return kickoffUtc(match).getTime();
}

/**
 * Find a fixture's result by its stable `matchId` — never by team pair.
 *
 * Team-pair matching looks tempting but breaks as the tournament progresses:
 * knockout fixtures carry placeholder names ("Winner Match 73", "Runner-up
 * Group A") that are not tickers, and two teams can meet twice (group + a
 * knockout), so one result would mislabel a second fixture. matchId is unique
 * per fixture and is stamped on the result when it's recorded, so it stays
 * correct in every round. Generic so callers keep their concrete result type.
 */
export function resultForMatch<T extends { matchId: string }>(
  match: ScheduledMatch,
  results: T[],
): T | undefined {
  return results.find((r) => r.matchId === match.id);
}

/** Matches scheduled for today (ET), sorted by kickoff time ascending. */
export function getTodaysMatches(): ScheduledMatch[] {
  const today = todayEt();
  return SCHEDULE.filter((m) => m.date === today).sort(
    (a, b) => timeToMinutes(a.time) - timeToMinutes(b.time),
  );
}

/**
 * The next `limit` matches that are today or in the future and have no
 * recorded result yet, sorted by date + time ascending.
 *
 * Note: the spec's behavior references the results array, so `results` is
 * accepted as an optional argument (defaults to []). getUpcomingMatches(n)
 * still works as written.
 */
export function getUpcomingMatches(
  limit: number,
  results: MatchResult[] = [],
): ScheduledMatch[] {
  if (limit <= 0) return [];
  const today = todayEt();
  return SCHEDULE.filter(
    (m) => m.date >= today && !resultForMatch(m, results),
  )
    .sort(compareByDateTime)
    .slice(0, limit);
}

/**
 * The single match to feature as "next": the earliest fixture (chronologically)
 * that is not yet settled. A fixture is settled when it has a recorded result
 * OR — once `now` is known — its live window has fully elapsed.
 *
 * Folding in the clock is what stops the banner from sticking on the opening
 * fixtures: a game that finished days ago but hasn't had its result recorded
 * (KV not yet populated, or the results fetch hasn't landed) is treated as
 * settled and skipped, so the banner lands on the genuine next match on first
 * paint instead of forcing a reload. A match still inside its live window is
 * never skipped — so an in-progress or just-finished game keeps the spotlight
 * even before its result is entered.
 *
 * `now` is optional and defaults to null (SSR / pre-mount), where behavior
 * falls back to results-only so server and client render identically.
 */
export function getNextUnplayedMatch<T extends { matchId: string }>(
  results: T[] = [],
  now: number | null = null,
): ScheduledMatch | null {
  return (
    [...SCHEDULE].sort(compareByDateTime).find((m) => {
      if (resultForMatch(m, results)) return false; // settled: result recorded
      // settled: kicked off long enough ago that it's certainly over
      if (now !== null && now >= getKickoffMs(m) + LIVE_WINDOW_MS) return false;
      return true;
    }) ?? null
  );
}

/**
 * Status of a single fixture.
 * - "completed" / "draw": a matching result exists.
 * - "live": match is today and now is within 2h after kickoff.
 * - "upcoming": everything else.
 */
export function getMatchStatus(
  match: ScheduledMatch,
  results: MatchResult[],
): "upcoming" | "live" | "completed" | "draw" {
  const result = resultForMatch(match, results);
  if (result) return result.isDraw ? "draw" : "completed";

  // No result recorded yet: derive state from the clock so a match that has
  // already kicked off and finished reads as full time, instead of showing its
  // kickoff time forever while the admin hasn't entered the result.
  const kickoff = kickoffUtc(match).getTime();
  const now = Date.now();
  if (now >= kickoff + LIVE_WINDOW_MS) return "completed"; // full time, result pending
  if (now >= kickoff) return "live";
  return "upcoming";
}

/**
 * Human-readable countdown / state for a fixture.
 * - "Completed" if a result exists.
 * - "LIVE NOW" while within the live window.
 * - "Starts in 2h 14m" (or "Starts in 3d 5h" for far-off matches) otherwise.
 *
 * Note: as with getUpcomingMatches, `results` is optional (defaults to []) so
 * the documented getTimeUntilMatch(match) signature still works.
 */
export function getTimeUntilMatch(
  match: ScheduledMatch,
  results: MatchResult[] = [],
): string {
  if (resultForMatch(match, results)) return "Completed";

  const now = Date.now();
  const kickoff = kickoffUtc(match).getTime();
  const diff = kickoff - now;

  if (diff > 0) {
    const totalMinutes = Math.floor(diff / MS_PER_MINUTE);
    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    const minutes = totalMinutes % 60;
    return days > 0
      ? `Starts in ${days}d ${hours}h`
      : `Starts in ${hours}h ${minutes}m`;
  }

  // Kickoff has passed: live for 2h, then treated as finished.
  return now <= kickoff + LIVE_WINDOW_MS ? "LIVE NOW" : "Completed";
}

/** Win/loss/draw tally for a team across the given results. */
export function getTeamRecord(
  ticker: string,
  results: { winner: string; loser: string; isDraw: boolean }[],
): { wins: number; losses: number; draws: number } {
  let wins = 0;
  let losses = 0;
  let draws = 0;

  for (const r of results) {
    if (r.isDraw) {
      if (r.winner === ticker || r.loser === ticker) draws++;
    } else if (r.winner === ticker) {
      wins++;
    } else if (r.loser === ticker) {
      losses++;
    }
  }

  return { wins, losses, draws };
}
