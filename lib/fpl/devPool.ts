// Dev-only synthetic player pool so the fantasy UI can be exercised locally
// without the paid Deep Data feed. Deterministic, generated from the team list,
// with a little intra-team price spread so budget choices actually bite. Only
// served when FANTASY_DEV_POOL=1 (see getPool); never used in production.

import { TEAMS } from "@/constants/teams";
import { priceFor } from "@/lib/fpl/prices";
import type { FplPlayer, Position } from "@/lib/fpl/types";

const PER_TEAM: Record<Position, number> = { GK: 3, DEF: 7, MID: 7, FWD: 5 };

export function devPool(): FplPlayer[] {
  const pool: FplPlayer[] = [];
  for (const team of TEAMS) {
    for (const pos of ["GK", "DEF", "MID", "FWD"] as Position[]) {
      for (let i = 0; i < PER_TEAM[pos]; i++) {
        const base = priceFor(team.ticker, pos);
        pool.push({
          id: `dev-${team.ticker}-${pos}-${i}`,
          name: `${team.name} ${pos}${i + 1}`,
          team: team.ticker,
          position: pos,
          price: Math.max(4.0, Math.round((base - i * 0.3) * 10) / 10),
        });
      }
    }
  }
  return pool;
}
