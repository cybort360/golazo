// Live scores from ESPN's free scoreboard (near-real-time, what powers
// espn.com). Returns the SAME ExternalMatch shape the existing pipeline
// consumes, so mapExternalMatches / mergeResults / the admin table are all
// untouched — this only changes where raw scores come from. Teams resolve by
// abbreviation → our ticker → our canonical name, so name-matching downstream is
// exact. Group vs knockout is derived from our own schedule.

import { TEAMS } from "@/constants/teams";
import { SCHEDULE } from "@/constants/schedule";
import { espnGet } from "@/lib/espn";
import type { ExternalMatch, LiveStatus } from "@/lib/resultsSync";

const TEAM_BY_TICKER = new Map(TEAMS.map((t) => [t.ticker, t]));
// ESPN abbreviation is normally our ticker; map any exceptions here if found.
const ABBR_ALIAS: Record<string, string> = {};

const pairKey = (a: string, b: string) => [a, b].sort().join("-");

// Group letter keyed by group-stage ticker pair (globally unique), used to flag
// an external match as group vs knockout the way mapExternalMatches expects.
const GROUP_BY_PAIR: Map<string, string> = (() => {
  const m = new Map<string, string>();
  for (const f of SCHEDULE) {
    if (
      f.groupOrRound.startsWith("Group") &&
      TEAM_BY_TICKER.has(f.teamA) &&
      TEAM_BY_TICKER.has(f.teamB)
    ) {
      m.set(pairKey(f.teamA, f.teamB), f.groupOrRound.replace("Group ", ""));
    }
  }
  return m;
})();

function tickerFromAbbr(abbr?: string): string | null {
  if (!abbr) return null;
  const up = abbr.toUpperCase();
  const t = ABBR_ALIAS[up] ?? up;
  return TEAM_BY_TICKER.has(t) ? t : null;
}

function statusOf(state?: string, completed?: boolean): LiveStatus {
  if (completed) return "finished";
  if (state === "in") return "live";
  if (state === "post") return "finished";
  return "scheduled";
}

interface RawCompetitor {
  homeAway?: string;
  score?: string;
  team?: { abbreviation?: string };
}
interface RawEvent {
  id?: string;
  date?: string;
  status?: { type?: { state?: string; completed?: boolean } };
  competitions?: { competitors?: RawCompetitor[] }[];
}
interface RawScoreboard {
  events?: RawEvent[];
}

function eventToExternal(e: RawEvent): ExternalMatch | null {
  const cs = e.competitions?.[0]?.competitors ?? [];
  const home = cs.find((c) => c.homeAway === "home") ?? cs[0];
  const away = cs.find((c) => c.homeAway === "away") ?? cs[1];
  if (!home || !away) return null;

  const ht = tickerFromAbbr(home.team?.abbreviation);
  const at = tickerFromAbbr(away.team?.abbreviation);
  if (!ht || !at) return null; // unresolved teams (placeholders) → skip

  const toScore = (s?: string) => (s != null && s !== "" ? Number(s) : null);
  const homeScore = toScore(home.score);
  const awayScore = toScore(away.score);

  const status = statusOf(e.status?.type?.state, e.status?.type?.completed);
  let winner: ExternalMatch["winner"] = null;
  if (status === "finished" && homeScore !== null && awayScore !== null) {
    winner = homeScore > awayScore ? "home" : awayScore > homeScore ? "away" : "draw";
  }

  const group = GROUP_BY_PAIR.get(pairKey(ht, at)) ?? null;
  return {
    stage: group ? "GROUP_STAGE" : "KNOCKOUT",
    group,
    utcDate: e.date ?? new Date().toISOString(),
    homeName: TEAM_BY_TICKER.get(ht)!.name,
    awayName: TEAM_BY_TICKER.get(at)!.name,
    status,
    homeScore,
    awayScore,
    winner,
  };
}

const ymd = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "");

/**
 * Every World Cup match ESPN knows about around now, normalized. Fetches the
 * scoreboard for yesterday/today/tomorrow (UTC) to cover late-ET kickoffs that
 * straddle the date line. Throws on total failure so the caller can fall back.
 */
export async function fetchWorldCupMatchesEspn(): Promise<ExternalMatch[]> {
  const now = new Date();
  const dates = [-1, 0, 1].map((off) => {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() + off);
    return ymd(d);
  });

  const events: RawEvent[] = [];
  const seen = new Set<string>();
  let anyOk = false;
  for (const date of dates) {
    try {
      const sb = await espnGet<RawScoreboard>(`/scoreboard?dates=${date}`);
      anyOk = true;
      for (const e of sb.events ?? []) {
        const key = e.id ?? e.date ?? "";
        if (key && !seen.has(key)) {
          seen.add(key);
          events.push(e);
        }
      }
    } catch {
      /* skip this date */
    }
  }
  if (!anyOk) throw new Error("ESPN scoreboard unreachable");

  return events
    .map(eventToExternal)
    .filter((m): m is ExternalMatch => m !== null);
}
