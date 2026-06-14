// Maps our schedule fixtures (GM###) to ESPN event ids by date + team pair, so
// stats can be pulled without anyone looking up event ids. Group-stage only:
// knockout fixtures carry placeholder team names in our schedule, so they can't
// be matched on tickers until the bracket fills (use the manual stats route for
// those). ESPN's team abbreviations line up with our tickers.

import { SCHEDULE, type ScheduledMatch } from "@/constants/schedule";
import { TEAMS } from "@/constants/teams";
import { getKickoffMs } from "@/lib/schedule";
import { espnGet } from "@/lib/espn";

const TICKERS = new Set(TEAMS.map((t) => t.ticker));
const pairKey = (a: string, b: string) =>
  [a.toUpperCase(), b.toUpperCase()].sort().join("-");

interface RawScoreboard {
  events?: {
    id?: string;
    competitions?: { competitors?: { team?: { abbreviation?: string } }[] }[];
  }[];
}

const yyyymmdd = (d: string) => d.replace(/-/g, "");
function plusOneDay(d: string): string {
  const dt = new Date(`${d}T00:00:00Z`);
  dt.setUTCDate(dt.getUTCDate() + 1);
  return dt.toISOString().slice(0, 10);
}

async function eventsForDate(date: string): Promise<{ id: string; key: string }[]> {
  try {
    const sb = await espnGet<RawScoreboard>(`/scoreboard?dates=${yyyymmdd(date)}`);
    const out: { id: string; key: string }[] = [];
    for (const e of sb.events ?? []) {
      const abbrs = (e.competitions?.[0]?.competitors ?? [])
        .map((c) => c.team?.abbreviation)
        .filter((a): a is string => !!a);
      if (e.id && abbrs.length === 2) out.push({ id: String(e.id), key: pairKey(abbrs[0], abbrs[1]) });
    }
    return out;
  } catch {
    return []; // a missing day shouldn't sink the whole sync
  }
}

/**
 * Group-stage fixtures whose kickoff has passed, mapped to their ESPN event id.
 * Queries each fixture's date and the next day (a late-ET kickoff lands on the
 * following UTC date on ESPN), then matches by team pair.
 */
export async function mapFinishedFixturesToEspn(
  now: number,
): Promise<Record<string, string>> {
  const fixtures = SCHEDULE.filter(
    (m: ScheduledMatch) =>
      TICKERS.has(m.teamA) && TICKERS.has(m.teamB) && getKickoffMs(m) <= now,
  );

  const dates = new Set<string>();
  for (const f of fixtures) {
    dates.add(f.date);
    dates.add(plusOneDay(f.date));
  }

  const index = new Map<string, string>(); // pair key -> ESPN event id
  for (const d of Array.from(dates)) {
    for (const ev of await eventsForDate(d)) {
      if (!index.has(ev.key)) index.set(ev.key, ev.id);
    }
  }

  const map: Record<string, string> = {};
  for (const f of fixtures) {
    const id = index.get(pairKey(f.teamA, f.teamB));
    if (id) map[f.id] = id;
  }
  return map;
}
