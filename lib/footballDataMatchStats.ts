// Derives per-player fantasy stats from a football-data.org match detail
// (GET /v4/matches/{id} on the Deep Data tier): lineups + substitutions →
// minutes, goals/assists/own-goals, bookings → cards, and the opponent's score
// → clean sheets / goals conceded.
//
// ⚠ The raw shape below is the documented v4 layout but has NOT been verified
// against a real Deep Data response (needs the paid tier live). parseMatchStats
// is pure and defensively typed so it degrades to zeros rather than throwing;
// verify field names against one real match before trusting automated scoring,
// and the admin manual-override route is the safety net meanwhile.

import type { PlayerMatchStats } from "@/lib/fpl/types";
import { zeroStats } from "@/lib/fpl/scoring";

const BASE_URL = "https://api.football-data.org/v4";

interface RawPerson {
  id?: number;
  name?: string;
}
interface RawLineupTeam {
  lineup?: RawPerson[]; // starters
  bench?: RawPerson[];
}
interface RawGoal {
  type?: string; // "REGULAR" | "OWN" | "PENALTY" | ...
  team?: { id?: number };
  scorer?: RawPerson;
  assist?: RawPerson | null;
}
interface RawBooking {
  team?: { id?: number };
  player?: RawPerson;
  card?: string; // "YELLOW" | "YELLOW_RED" | "RED"
}
interface RawSubstitution {
  minute?: number;
  team?: { id?: number };
  playerOut?: RawPerson;
  playerIn?: RawPerson;
}
interface RawMatchDetail {
  homeTeam?: { id?: number } & RawLineupTeam;
  awayTeam?: { id?: number } & RawLineupTeam;
  score?: { fullTime?: { home?: number | null; away?: number | null } };
  goals?: RawGoal[];
  bookings?: RawBooking[];
  substitutions?: RawSubstitution[];
}

const FULL_MATCH = 90;

/** Parse one raw match detail into a stat line per player who featured. */
export function parseMatchStats(raw: RawMatchDetail): PlayerMatchStats[] {
  const homeId = raw.homeTeam?.id;
  const homeConceded = raw.score?.fullTime?.away ?? 0;
  const awayConceded = raw.score?.fullTime?.home ?? 0;

  const stat = new Map<string, PlayerMatchStats>();
  const get = (id: string) => {
    let s = stat.get(id);
    if (!s) {
      s = zeroStats(id);
      stat.set(id, s);
    }
    return s;
  };

  // Minutes from lineups + substitutions. A starter plays to 90 unless subbed
  // off; a bench player plays from their sub-on minute to 90.
  const subOffMin = new Map<string, number>();
  const subOnMin = new Map<string, number>();
  for (const sub of raw.substitutions ?? []) {
    const min = sub.minute ?? FULL_MATCH;
    if (sub.playerOut?.id != null) subOffMin.set(String(sub.playerOut.id), min);
    if (sub.playerIn?.id != null) subOnMin.set(String(sub.playerIn.id), min);
  }

  const applyTeam = (team: RawLineupTeam | undefined, conceded: number) => {
    for (const p of team?.lineup ?? []) {
      if (p.id == null) continue;
      const id = String(p.id);
      const s = get(id);
      s.minutes = subOffMin.get(id) ?? FULL_MATCH;
      s.goalsConceded = conceded;
      s.cleanSheet = conceded === 0;
    }
    for (const p of team?.bench ?? []) {
      if (p.id == null) continue;
      const id = String(p.id);
      const on = subOnMin.get(id);
      if (on == null) continue; // unused sub → no appearance
      const s = get(id);
      s.minutes = Math.max(0, FULL_MATCH - on);
      s.goalsConceded = conceded;
      s.cleanSheet = conceded === 0;
    }
  };
  applyTeam(raw.homeTeam, homeConceded);
  applyTeam(raw.awayTeam, awayConceded);

  for (const g of raw.goals ?? []) {
    const scorerId = g.scorer?.id != null ? String(g.scorer.id) : null;
    if (scorerId) {
      if ((g.type ?? "").toUpperCase() === "OWN") get(scorerId).ownGoals += 1;
      else get(scorerId).goals += 1;
    }
    if (g.assist?.id != null) get(String(g.assist.id)).assists += 1;
  }

  for (const b of raw.bookings ?? []) {
    if (b.player?.id == null) continue;
    const s = get(String(b.player.id));
    const card = (b.card ?? "").toUpperCase();
    if (card.includes("RED")) s.redCards += 1; // RED or YELLOW_RED
    else if (card.includes("YELLOW")) s.yellowCards += 1;
  }

  // Touch homeId so a future home/away-specific rule has it; harmless no-op now.
  void homeId;
  return Array.from(stat.values());
}

/** Fetch + parse one match's player stats. Throws on auth/HTTP error. */
export async function fetchMatchStats(matchId: string): Promise<PlayerMatchStats[]> {
  const token = process.env.WORLD_CUP_API_TOKEN;
  if (!token) throw new Error("WORLD_CUP_API_TOKEN not configured");
  const res = await fetch(`${BASE_URL}/matches/${matchId}`, {
    headers: { "X-Auth-Token": token },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`football-data.org responded ${res.status}`);
  const raw = (await res.json()) as RawMatchDetail;
  return parseMatchStats(raw);
}
