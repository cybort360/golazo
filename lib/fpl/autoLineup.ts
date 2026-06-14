// Picks a sensible default XI from a 15-player squad: a 3-4-3, strongest players
// (by price) starting, captain on the priciest. Managers tweak from here. Pure
// and total — assumes a valid 2/5/5/3 squad, the shape validateSquad enforces.

import type { FplPlayer, GameweekLineup, Position } from "@/lib/fpl/types";

const STARTERS: Record<Position, number> = { GK: 1, DEF: 3, MID: 4, FWD: 3 };

export function autoLineup(
  squad: string[],
  lookup: (id: string) => FplPlayer | undefined,
): GameweekLineup {
  const byPos: Record<Position, FplPlayer[]> = { GK: [], DEF: [], MID: [], FWD: [] };
  for (const id of squad) {
    const p = lookup(id);
    if (p) byPos[p.position].push(p);
  }
  for (const pos of Object.keys(byPos) as Position[]) {
    byPos[pos].sort((a, b) => b.price - a.price);
  }

  const starters: string[] = [];
  const bench: string[] = [];
  for (const pos of ["GK", "DEF", "MID", "FWD"] as Position[]) {
    byPos[pos].forEach((p, i) => {
      (i < STARTERS[pos] ? starters : bench).push(p.id);
    });
  }
  // Keep the reserve keeper first on the bench (cosmetic; no auto-subs in v1).
  bench.sort((a, b) => (lookup(a)?.position === "GK" ? -1 : 0) - (lookup(b)?.position === "GK" ? -1 : 0));

  // Captain + vice = two priciest starters.
  const byPrice = [...starters].sort(
    (a, b) => (lookup(b)?.price ?? 0) - (lookup(a)?.price ?? 0),
  );
  return {
    starters,
    bench,
    captain: byPrice[0],
    viceCaptain: byPrice[1] ?? byPrice[0],
  };
}
