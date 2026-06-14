// Parses an ESPN match summary into our per-player PlayerMatchStats. Per-player
// stats come from rosters[].roster[].stats[] (keyed by `name`); minutes are
// derived from the starter/sub flags + the substitution clock, and clean sheets
// / goals-conceded from the opponent's goals (so it's right for every position,
// not just keepers). Pure parse split from the fetch so it's testable against a
// real payload.

import type { PlayerMatchStats } from "@/lib/fpl/types";
import { zeroStats } from "@/lib/fpl/scoring";
import { espnGet } from "@/lib/espn";

interface RawStat {
  name?: string;
  value?: number;
}
interface RawPlay {
  substitution?: boolean;
  clock?: { displayValue?: string };
}
interface RawRosterPlayer {
  athlete?: { id?: string | number };
  starter?: boolean;
  subbedIn?: boolean;
  subbedOut?: boolean;
  stats?: RawStat[];
  plays?: RawPlay[];
}
interface RawRoster {
  roster?: RawRosterPlayer[];
}
export interface RawEspnSummary {
  rosters?: RawRoster[];
}

const FULL_MATCH = 90;

function stat(stats: RawStat[] | undefined, name: string): number {
  return stats?.find((s) => s.name === name)?.value ?? 0;
}

function clockMinute(dv?: string): number | null {
  if (!dv) return null;
  const n = parseInt(dv, 10); // "84'" → 84, "90'+2" → 90
  return Number.isFinite(n) ? n : null;
}

function minutesFor(p: RawRosterPlayer): number {
  const subPlay = (p.plays ?? []).find((x) => x.substitution);
  const subMin = subPlay ? clockMinute(subPlay.clock?.displayValue) : null;
  if (p.starter) return p.subbedOut && subMin !== null ? subMin : FULL_MATCH;
  if (p.subbedIn) return subMin !== null ? Math.max(1, FULL_MATCH - subMin) : 1;
  return stat(p.stats, "appearances") > 0 ? FULL_MATCH : 0;
}

export function parseEspnSummary(raw: RawEspnSummary): PlayerMatchStats[] {
  const teams = (raw.rosters ?? []).map((r) => {
    const players = r.roster ?? [];
    return {
      players,
      scored: players.reduce((s, p) => s + stat(p.stats, "totalGoals"), 0),
      own: players.reduce((s, p) => s + stat(p.stats, "ownGoals"), 0),
    };
  });

  const out: PlayerMatchStats[] = [];
  teams.forEach((team, idx) => {
    // A team concedes the opponent's goals plus any own goals it scored.
    const opponent = teams.length === 2 ? teams[1 - idx] : undefined;
    const conceded = (opponent?.scored ?? 0) + team.own;
    for (const p of team.players) {
      const id = p.athlete?.id != null ? String(p.athlete.id) : null;
      if (!id) continue;
      out.push({
        ...zeroStats(id),
        minutes: minutesFor(p),
        goals: stat(p.stats, "totalGoals"),
        assists: stat(p.stats, "goalAssists"),
        cleanSheet: conceded === 0,
        goalsConceded: conceded,
        yellowCards: stat(p.stats, "yellowCards"),
        redCards: stat(p.stats, "redCards"),
        ownGoals: stat(p.stats, "ownGoals"),
      });
    }
  });
  return out;
}

/** Fetch + parse one match's player stats from ESPN. Throws on HTTP error. */
export async function fetchEspnMatchStats(eventId: string): Promise<PlayerMatchStats[]> {
  const raw = await espnGet<RawEspnSummary>(`/summary?event=${encodeURIComponent(eventId)}`);
  return parseEspnSummary(raw);
}

// ── Goal scorers (for the live banner) ───────────────────────────────────────

export interface MatchGoal {
  team: string; // ticker the goal counts FOR (own goals credit the opponent)
  scorer: string;
  minute: string; // e.g. "23'"
  ownGoal: boolean;
  penalty: boolean;
}

interface RawGoalPlay {
  scoringPlay?: boolean;
  didScore?: boolean; // true on the scorer's copy, false on the assister's
  ownGoal?: boolean;
  penaltyKick?: boolean;
  clock?: { displayValue?: string };
}
interface RawGoalPlayer {
  athlete?: { fullName?: string; displayName?: string; shortName?: string };
  plays?: RawGoalPlay[];
}
interface RawGoalRoster {
  team?: { abbreviation?: string };
  roster?: RawGoalPlayer[];
}
interface RawGoalsSummary {
  rosters?: RawGoalRoster[];
}

/** Goals from a match summary, sorted by minute. Own goals are credited to the
 *  opponent (how they actually count on the scoreline). */
export function parseEspnGoals(raw: RawGoalsSummary): MatchGoal[] {
  const rosters = raw.rosters ?? [];
  const tickers = rosters.map((r) => (r.team?.abbreviation ?? "").toUpperCase());
  const goals: MatchGoal[] = [];

  rosters.forEach((r, idx) => {
    const own = tickers[idx];
    const opp = rosters.length === 2 ? tickers[1 - idx] : own;
    for (const p of r.roster ?? []) {
      const name = p.athlete?.shortName || p.athlete?.fullName || p.athlete?.displayName;
      if (!name) continue;
      for (const play of p.plays ?? []) {
        if (!play.scoringPlay) continue;
        // The same scoring play is attached to both scorer and assister; only
        // the scorer's copy has didScore (own goals count too).
        if (!play.didScore && !play.ownGoal) continue;
        const ownGoal = !!play.ownGoal;
        goals.push({
          team: ownGoal ? opp : own,
          scorer: name,
          minute: play.clock?.displayValue ?? "",
          ownGoal,
          penalty: !!play.penaltyKick,
        });
      }
    }
  });

  return goals.sort(
    (a, b) => (parseInt(a.minute, 10) || 0) - (parseInt(b.minute, 10) || 0),
  );
}

/** Fetch + parse goal scorers for a match. Throws on HTTP error. */
export async function fetchEspnGoals(eventId: string): Promise<MatchGoal[]> {
  const raw = await espnGet<RawGoalsSummary>(`/summary?event=${encodeURIComponent(eventId)}`);
  return parseEspnGoals(raw);
}
