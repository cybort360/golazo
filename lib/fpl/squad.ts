// Pure squad and lineup rules: budget, composition, country cap, and the
// per-gameweek formation legality plus transfer-hit math. No IO — callers pass
// a lookup from player id to FplPlayer.

import type { FplPlayer, GameweekLineup, Position } from "@/lib/fpl/types";

export const BUDGET = 100.0;
export const SQUAD_SIZE = 15;
export const MAX_PER_TEAM = 3;
export const FREE_TRANSFERS_PER_GW = 1;
export const TRANSFER_HIT = 4;

// Required squad composition and the legal range of starters per position.
const SQUAD_BY_POSITION: Record<Position, number> = { GK: 2, DEF: 5, MID: 5, FWD: 3 };
const STARTERS_MIN: Record<Position, number> = { GK: 1, DEF: 3, MID: 2, FWD: 1 };
const STARTERS_MAX: Record<Position, number> = { GK: 1, DEF: 5, MID: 5, FWD: 3 };

export type Check = { ok: true } | { ok: false; error: string };

type Lookup = (id: string) => FplPlayer | undefined;

function countByPosition(ids: string[], lookup: Lookup): Record<Position, number> {
  const counts: Record<Position, number> = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
  for (const id of ids) {
    const p = lookup(id);
    if (p) counts[p.position]++;
  }
  return counts;
}

/** Total price of a set of players (0 for unknown ids). */
export function squadPrice(ids: string[], lookup: Lookup): number {
  return ids.reduce((sum, id) => sum + (lookup(id)?.price ?? 0), 0);
}

/** Validate the 15-player squad: size, no dupes, composition, country cap, budget. */
export function validateSquad(ids: string[], lookup: Lookup): Check {
  if (ids.length !== SQUAD_SIZE) {
    return { ok: false, error: `Squad must be ${SQUAD_SIZE} players` };
  }
  if (new Set(ids).size !== ids.length) {
    return { ok: false, error: "Duplicate player in squad" };
  }
  for (const id of ids) {
    if (!lookup(id)) return { ok: false, error: "Unknown player in squad" };
  }

  const counts = countByPosition(ids, lookup);
  for (const pos of Object.keys(SQUAD_BY_POSITION) as Position[]) {
    if (counts[pos] !== SQUAD_BY_POSITION[pos]) {
      return {
        ok: false,
        error: `Squad needs exactly ${SQUAD_BY_POSITION[pos]} ${pos}`,
      };
    }
  }

  const byTeam = new Map<string, number>();
  for (const id of ids) {
    const team = lookup(id)!.team;
    const n = (byTeam.get(team) ?? 0) + 1;
    if (n > MAX_PER_TEAM) {
      return { ok: false, error: `Max ${MAX_PER_TEAM} players from one country` };
    }
    byTeam.set(team, n);
  }

  // Guard floating-point drift on the budget comparison.
  if (squadPrice(ids, lookup) > BUDGET + 1e-9) {
    return { ok: false, error: `Squad is over the ${BUDGET.toFixed(1)} budget` };
  }

  return { ok: true };
}

/**
 * Validate a gameweek lineup against an already-valid squad: 11 starters + 4
 * bench that partition the 15, a legal formation, and a captain + distinct
 * vice that are both starters.
 */
export function validateLineup(
  lineup: GameweekLineup,
  squad: string[],
  lookup: Lookup,
): Check {
  const { starters, bench, captain, viceCaptain } = lineup;
  if (starters.length !== 11) return { ok: false, error: "Pick exactly 11 starters" };
  if (bench.length !== 4) return { ok: false, error: "Bench must be 4 players" };

  const all = [...starters, ...bench];
  if (new Set(all).size !== all.length) {
    return { ok: false, error: "A player can't be in two slots" };
  }
  const squadSet = new Set(squad);
  if (all.length !== squadSet.size || !all.every((id) => squadSet.has(id))) {
    return { ok: false, error: "Lineup must use your 15 squad players" };
  }

  const counts = countByPosition(starters, lookup);
  for (const pos of Object.keys(STARTERS_MIN) as Position[]) {
    if (counts[pos] < STARTERS_MIN[pos] || counts[pos] > STARTERS_MAX[pos]) {
      return { ok: false, error: "Illegal formation" };
    }
  }

  if (!starters.includes(captain)) {
    return { ok: false, error: "Captain must be a starter" };
  }
  if (!starters.includes(viceCaptain)) {
    return { ok: false, error: "Vice-captain must be a starter" };
  }
  if (captain === viceCaptain) {
    return { ok: false, error: "Captain and vice must differ" };
  }

  return { ok: true };
}

/** Points deducted for a gameweek's transfers: 4 per transfer beyond the free one. */
export function transferCost(
  transfersMade: number,
  freeTransfers: number = FREE_TRANSFERS_PER_GW,
): number {
  return Math.max(0, transfersMade - freeTransfers) * TRANSFER_HIT;
}
