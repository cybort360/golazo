// Pure mapping between an external results feed (football-data.org, normalized
// in lib/footballData.ts) and our own fixture model. No network, no KV — this is
// the testable brain that decides which external match corresponds to which of
// our SCHEDULE fixtures, and converts finished matches into MatchResults.
//
// Safety rule: only emit a live entry or a result when the external match maps
// confidently to one of our fixtures and both teams resolve to a ticker.
// Anything ambiguous is reported in `unmapped` and left for manual override —
// we never invent or mis-attribute a score.

import { SCHEDULE, type ScheduledMatch } from "@/constants/schedule";
import { TEAMS } from "@/constants/teams";
import type { MatchResult } from "@/hooks/useMatchResults";

export type LiveStatus =
  | "scheduled"
  | "live"
  | "paused"
  | "finished"
  | "other";

/** A match from the external feed, already normalized by the provider client. */
export interface ExternalMatch {
  stage: string; // raw external stage, e.g. "GROUP_STAGE", "LAST_16"
  group: string | null; // raw external group, e.g. "GROUP_A"; null for knockouts
  utcDate: string; // ISO kickoff timestamp
  homeName: string; // external team name, e.g. "Brazil"
  awayName: string;
  status: LiveStatus;
  homeScore: number | null;
  awayScore: number | null;
  // Overall winner per the feed, including penalties for knockouts.
  winner: "home" | "away" | "draw" | null;
}

/** Per-fixture live snapshot, keyed by our matchId, served to the public site. */
export interface LiveMatch {
  matchId: string;
  status: LiveStatus;
  homeTicker: string;
  awayTicker: string;
  homeScore: number | null;
  awayScore: number | null;
}

export interface SyncOutcome {
  live: LiveMatch[];
  finals: MatchResult[];
  unmapped: ExternalMatch[];
}

// ── Team-name → ticker resolution ─────────────────────────────────────────────

/** lowercase, strip diacritics and any non-letter so spelling variants collapse. */
function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip combining diacritical marks
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

// Known feed spellings that don't match our team name once normalized. Keyed by
// normalized external name → our ticker. Our own names are added automatically
// below, so this only needs the genuine mismatches.
const NAME_ALIASES: Record<string, string> = {
  turkey: "TUR", // we store "Türkiye"
  korearepublic: "KOR", // we store "South Korea"
  republicofkorea: "KOR",
  czechrepublic: "CZE", // we store "Czechia"
  cotedivoire: "CIV", // we store "Ivory Coast"; feed may use "Côte d'Ivoire"
  caboverde: "CPV", // we store "Cape Verde"
  capeverdeislands: "CPV", // football-data's spelling
  congodr: "COD", // we store "DR Congo"
  drcongo: "COD",
  democraticrepublicofcongo: "COD",
  iriran: "IRN", // we store "Iran"
  usa: "USA",
  unitedstatesofamerica: "USA",
  bosniaandherzegovina: "BIH",
  bosniaherzegovina: "BIH",
};

const NAME_TO_TICKER: Map<string, string> = (() => {
  const map = new Map<string, string>();
  for (const t of TEAMS) map.set(normalizeName(t.name), t.ticker);
  for (const [name, ticker] of Object.entries(NAME_ALIASES)) {
    map.set(normalizeName(name), ticker);
  }
  return map;
})();

/** Resolve an external team name to our ticker, or null if we don't know it. */
export function tickerForExternalName(name: string): string | null {
  return NAME_TO_TICKER.get(normalizeName(name)) ?? null;
}

// ── Stage / round mapping ─────────────────────────────────────────────────────

/** External stage strings → our SCHEDULE `groupOrRound` round labels. */
const STAGE_TO_ROUND: Record<string, string> = {
  LAST_32: "Round of 32",
  ROUND_OF_32: "Round of 32",
  LAST_16: "Round of 16",
  ROUND_OF_16: "Round of 16",
  QUARTER_FINALS: "Quarterfinal",
  QUARTER_FINAL: "Quarterfinal",
  SEMI_FINALS: "Semifinal",
  SEMI_FINAL: "Semifinal",
  THIRD_PLACE: "Third-Place Match",
  THIRD_PLACE_PLAYOFF: "Third-Place Match",
  THIRD_PLACE_FINAL: "Third-Place Match",
  FINAL: "Final",
};

function roundForStage(stage: string): string | null {
  const key = stage.trim().toUpperCase().replace(/[\s-]+/g, "_");
  return STAGE_TO_ROUND[key] ?? null;
}

// ── Fixture indexes (built once from the static SCHEDULE) ─────────────────────

function pairKey(a: string, b: string): string {
  return [a, b].sort().join("|");
}

// Group fixtures keyed by their unordered ticker pair — globally unique in the
// group stage, so we never need the group letter to disambiguate.
const GROUP_FIXTURE_BY_PAIR: Map<string, ScheduledMatch> = (() => {
  const map = new Map<string, ScheduledMatch>();
  for (const m of SCHEDULE) {
    if (m.groupOrRound.startsWith("Group")) {
      map.set(pairKey(m.teamA, m.teamB), m);
    }
  }
  return map;
})();

function timeToMinutes(time: string): number {
  const m = /^(\d{1,2}):(\d{2})/.exec(time);
  return m ? Number(m[1]) * 60 + Number(m[2]) : 0;
}

// Knockout fixtures grouped by round label, in chronological order. The Nth
// external match of a round maps to the Nth fixture here.
const KNOCKOUT_FIXTURES_BY_ROUND: Map<string, ScheduledMatch[]> = (() => {
  const map = new Map<string, ScheduledMatch[]>();
  for (const m of SCHEDULE) {
    if (m.groupOrRound.startsWith("Group")) continue;
    const list = map.get(m.groupOrRound) ?? [];
    list.push(m);
    map.set(m.groupOrRound, list);
  }
  for (const list of Array.from(map.values())) {
    list.sort((a, b) =>
      a.date !== b.date
        ? a.date < b.date
          ? -1
          : 1
        : timeToMinutes(a.time) - timeToMinutes(b.time),
    );
  }
  return map;
})();

// ── Mapping ───────────────────────────────────────────────────────────────────

interface ResolvedExternal {
  ext: ExternalMatch;
  homeTicker: string;
  awayTicker: string;
}

function toLiveMatch(matchId: string, r: ResolvedExternal): LiveMatch {
  return {
    matchId,
    status: r.ext.status,
    homeTicker: r.homeTicker,
    awayTicker: r.awayTicker,
    homeScore: r.ext.homeScore,
    awayScore: r.ext.awayScore,
  };
}

function toResult(
  matchId: string,
  r: ResolvedExternal,
  now: number,
): MatchResult | null {
  const { ext, homeTicker, awayTicker } = r;
  // Prefer the feed's explicit winner (it accounts for penalties); fall back to
  // comparing scores when it's absent.
  let winnerSide = ext.winner;
  if (winnerSide === null) {
    if (ext.homeScore === null || ext.awayScore === null) return null;
    winnerSide =
      ext.homeScore > ext.awayScore
        ? "home"
        : ext.awayScore > ext.homeScore
          ? "away"
          : "draw";
  }

  if (winnerSide === "draw") {
    return {
      matchId,
      winner: homeTicker,
      loser: awayTicker,
      isDraw: true,
      goalsWinner: ext.homeScore,
      goalsLoser: ext.awayScore,
      timestamp: now,
      source: "api",
    };
  }

  const homeWon = winnerSide === "home";
  return {
    matchId,
    winner: homeWon ? homeTicker : awayTicker,
    loser: homeWon ? awayTicker : homeTicker,
    isDraw: false,
    goalsWinner: homeWon ? ext.homeScore : ext.awayScore,
    goalsLoser: homeWon ? ext.awayScore : ext.homeScore,
    timestamp: now,
    source: "api",
  };
}

/**
 * Map a batch of external matches onto our fixtures.
 *
 * @param external normalized matches from the provider
 * @param now epoch ms stamped onto any results produced (injected for testing)
 */
export function mapExternalMatches(
  external: ExternalMatch[],
  now: number = Date.now(),
): SyncOutcome {
  const live: LiveMatch[] = [];
  const finals: MatchResult[] = [];
  const unmapped: ExternalMatch[] = [];

  // Resolve tickers up front; anything unresolved is unmapped and skipped.
  const resolved: ResolvedExternal[] = [];
  for (const ext of external) {
    const homeTicker = tickerForExternalName(ext.homeName);
    const awayTicker = tickerForExternalName(ext.awayName);
    if (homeTicker === null || awayTicker === null) {
      unmapped.push(ext);
      continue;
    }
    resolved.push({ ext, homeTicker, awayTicker });
  }

  const isKnockout = (r: ResolvedExternal) => r.ext.group === null;

  // Group matches: deterministic unordered-pair match.
  for (const r of resolved.filter((x) => !isKnockout(x))) {
    const fixture = GROUP_FIXTURE_BY_PAIR.get(
      pairKey(r.homeTicker, r.awayTicker),
    );
    if (!fixture) {
      unmapped.push(r.ext);
      continue;
    }
    live.push(toLiveMatch(fixture.id, r));
    if (r.ext.status === "finished") {
      const result = toResult(fixture.id, r, now);
      if (result) finals.push(result);
    }
  }

  // Knockout matches: bucket by round, then map Nth-by-date to Nth fixture.
  const knockoutByRound = new Map<string, ResolvedExternal[]>();
  for (const r of resolved.filter(isKnockout)) {
    const round = roundForStage(r.ext.stage);
    if (round === null) {
      unmapped.push(r.ext);
      continue;
    }
    const list = knockoutByRound.get(round) ?? [];
    list.push(r);
    knockoutByRound.set(round, list);
  }

  for (const [round, list] of Array.from(knockoutByRound.entries())) {
    const fixtures = KNOCKOUT_FIXTURES_BY_ROUND.get(round) ?? [];
    const sorted = [...list].sort((a, b) =>
      a.ext.utcDate < b.ext.utcDate ? -1 : a.ext.utcDate > b.ext.utcDate ? 1 : 0,
    );
    sorted.forEach((r, i) => {
      const fixture = fixtures[i];
      if (!fixture) {
        unmapped.push(r.ext); // more external matches than we have slots for
        return;
      }
      live.push(toLiveMatch(fixture.id, r));
      if (r.ext.status === "finished") {
        const result = toResult(fixture.id, r, now);
        if (result) finals.push(result);
      }
    });
  }

  return { live, finals, unmapped };
}

/**
 * Merge freshly-synced API results into the stored results, preserving any
 * match a human has manually corrected (`source: "manual"`). API results never
 * overwrite manual ones; they replace prior API results for the same match.
 */
export function mergeResults(
  existing: MatchResult[],
  incoming: MatchResult[],
): MatchResult[] {
  const byId = new Map<string, MatchResult>();
  for (const r of existing) byId.set(r.matchId, r);
  for (const r of incoming) {
    const prior = byId.get(r.matchId);
    if (prior && prior.source === "manual") continue; // never clobber a human edit
    byId.set(r.matchId, r);
  }
  return Array.from(byId.values());
}
