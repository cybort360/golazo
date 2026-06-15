// Derives fantasy gameweeks from the World Cup schedule. Group stage splits into
// three matchdays (each group plays its 1st/2nd chrono game in MD1, etc.); each
// knockout round is its own gameweek, with the final round bundling the
// third-place match and the final. A gameweek's deadline is its first kickoff —
// teams lock then. Pure; takes the schedule as a parameter for testability.

import { SCHEDULE, type ScheduledMatch } from "@/constants/schedule";
import { getKickoffMs, LIVE_WINDOW_MS } from "@/lib/schedule";
import type { Gameweek } from "@/lib/fpl/types";

const KNOCKOUT_ROUNDS: { rounds: string[]; gw: number; label: string }[] = [
  { rounds: ["Round of 32"], gw: 4, label: "Round of 32" },
  { rounds: ["Round of 16"], gw: 5, label: "Round of 16" },
  { rounds: ["Quarterfinal"], gw: 6, label: "Quarterfinals" },
  { rounds: ["Semifinal"], gw: 7, label: "Semifinals" },
  { rounds: ["Third-Place Match", "Final"], gw: 8, label: "Final" },
];

const byKickoff = (a: ScheduledMatch, b: ScheduledMatch) =>
  getKickoffMs(a) - getKickoffMs(b);

export function buildGameweeks(schedule: ScheduledMatch[] = SCHEDULE): Gameweek[] {
  // Group stage → 3 matchdays. Within each group the two earliest games are
  // matchday 1, the next two matchday 2, the last two matchday 3.
  const matchdayOf = new Map<string, number>();
  const groups = new Map<string, ScheduledMatch[]>();
  for (const m of schedule) {
    if (!m.groupOrRound.startsWith("Group ")) continue;
    const arr = groups.get(m.groupOrRound) ?? [];
    arr.push(m);
    groups.set(m.groupOrRound, arr);
  }
  for (const arr of Array.from(groups.values())) {
    arr.sort(byKickoff);
    arr.forEach((m, i) => matchdayOf.set(m.id, Math.floor(i / 2) + 1));
  }

  const gameweeks: Gameweek[] = [];

  for (const md of [1, 2, 3]) {
    const matches = schedule
      .filter((m) => matchdayOf.get(m.id) === md)
      .sort(byKickoff);
    if (matches.length === 0) continue;
    gameweeks.push({
      id: `GW${md}`,
      label: `Group Matchday ${md}`,
      matchIds: matches.map((m) => m.id),
      deadlineMs: getKickoffMs(matches[0]),
    });
  }

  for (const ko of KNOCKOUT_ROUNDS) {
    const matches = schedule
      .filter((m) => ko.rounds.includes(m.groupOrRound))
      .sort(byKickoff);
    if (matches.length === 0) continue;
    gameweeks.push({
      id: `GW${ko.gw}`,
      label: ko.label,
      matchIds: matches.map((m) => m.id),
      deadlineMs: getKickoffMs(matches[0]),
    });
  }

  return gameweeks.sort((a, b) => a.deadlineMs - b.deadlineMs);
}

/**
 * When the gameweek finishes — its last match reaching full time, treated as
 * LIVE_WINDOW_MS after that match's kickoff (mirrors lib/schedule's notion of a
 * match being "done"). The Gameweek only stores deadlineMs (the first kickoff,
 * its lock point), so the end has to be derived from the fixtures. Powers the
 * "gameweek ends in…" countdown. Falls back to the deadline for an empty week.
 */
export function gameweekEndMs(
  gw: Gameweek,
  schedule: ScheduledMatch[] = SCHEDULE,
): number {
  const byId = new Map(schedule.map((m) => [m.id, m]));
  let end = gw.deadlineMs;
  for (const id of gw.matchIds) {
    const m = byId.get(id);
    if (m) end = Math.max(end, getKickoffMs(m) + LIVE_WINDOW_MS);
  }
  return end;
}

/** Convenience snapshot for production callers; tests use buildGameweeks(). */
export const GAMEWEEKS: Gameweek[] = buildGameweeks();

export function gameweekById(
  id: string,
  gameweeks: Gameweek[] = GAMEWEEKS,
): Gameweek | undefined {
  return gameweeks.find((g) => g.id === id);
}

export function gameweekForMatch(
  matchId: string,
  gameweeks: Gameweek[] = GAMEWEEKS,
): Gameweek | undefined {
  return gameweeks.find((g) => g.matchIds.includes(matchId));
}

/**
 * The gameweek currently open for team changes: the earliest whose deadline is
 * still in the future. Returns null once the last deadline has passed.
 */
export function upcomingGameweek(
  now: number,
  gameweeks: Gameweek[] = GAMEWEEKS,
): Gameweek | null {
  return gameweeks.find((g) => g.deadlineMs > now) ?? null;
}

/**
 * The most recent gameweek whose deadline has passed — i.e. the one being
 * played / scored right now. Returns null before the first deadline.
 */
export function activeGameweek(
  now: number,
  gameweeks: Gameweek[] = GAMEWEEKS,
): Gameweek | null {
  let active: Gameweek | null = null;
  for (const g of gameweeks) {
    if (g.deadlineMs <= now) active = g;
    else break;
  }
  return active;
}
