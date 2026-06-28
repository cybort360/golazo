// Parses goal scorers out of an ESPN match summary for the live banner. Pure
// parse split from the fetch so it's testable against a real payload.

import { espnGet } from "@/lib/espn";

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
