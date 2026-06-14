// Algorithmic player valuations: team-strength tier × position baseline. This
// sidesteps hand-pricing ~1,100 players while still giving scarcity — you can
// field a full cheap squad well under budget, but not a team of all premiums.
// Tiers are a starting point and deliberately tunable; admin can override any
// single price after seeding.

import type { Position } from "@/lib/fpl/types";

// Lower tier = stronger team = pricier players. Anything unlisted is tier 3.
const TEAM_TIER: Record<string, 1 | 2 | 3 | 4> = {
  // Tier 1 — favourites
  BRA: 1, ARG: 1, FRA: 1, ENG: 1, ESP: 1, GER: 1, POR: 1, NED: 1,
  // Tier 2 — strong
  BEL: 2, CRO: 2, URU: 2, COL: 2, USA: 2, MEX: 2, JPN: 2, SEN: 2,
  MAR: 2, SUI: 2, CIV: 2, ECU: 2, SWE: 2, NOR: 2, AUT: 2,
  // Tier 4 — outsiders / debutants
  CUW: 4, HAI: 4, NZL: 4, JOR: 4, PAN: 4,
};

const DEFAULT_TIER = 3;

// price[tier][position]
const BASELINE: Record<1 | 2 | 3 | 4, Record<Position, number>> = {
  1: { GK: 5.5, DEF: 6.0, MID: 8.5, FWD: 9.5 },
  2: { GK: 5.0, DEF: 5.5, MID: 7.0, FWD: 8.0 },
  3: { GK: 4.5, DEF: 5.0, MID: 6.0, FWD: 6.5 },
  4: { GK: 4.0, DEF: 4.5, MID: 5.0, FWD: 5.5 },
};

export function teamTier(team: string): 1 | 2 | 3 | 4 {
  return TEAM_TIER[team] ?? DEFAULT_TIER;
}

/** Seeded price for a player on `team` playing `position`. */
export function priceFor(team: string, position: Position): number {
  return BASELINE[teamTier(team)][position];
}
