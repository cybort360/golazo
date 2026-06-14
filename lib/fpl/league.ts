// Pure helpers for private leagues: pot/rake math, the scoring window, and
// parameter validation. No IO — the routes and admin view share these so the
// numbers shown to players match what settlement computes.

import type { Gameweek } from "@/lib/fpl/types";

export const DEFAULT_RAKE_BPS = 1000; // 10% platform fee
export const MIN_ENTRY_FEE = 1000; // $GOLAZO floor so pots are meaningful
export const MAX_ENTRY_FEE = 100_000_000;
export const MIN_MEMBERS = 2; // fewer than this at lock → void + refund

export interface PotBreakdown {
  pot: number;
  rake: number;
  net: number; // to the winner
}

/** Pot, platform rake, and the winner's net for a league. */
export function potBreakdown(
  entryFee: number,
  memberCount: number,
  rakeBps: number = DEFAULT_RAKE_BPS,
): PotBreakdown {
  const pot = entryFee * memberCount;
  const rake = Math.floor((pot * rakeBps) / 10_000);
  return { pot, rake, net: pot - rake };
}

/** Gameweeks a league scores over: from its start gameweek through the last. */
export function gameweekWindow(startGwId: string, gameweeks: Gameweek[]): Gameweek[] {
  const i = gameweeks.findIndex((g) => g.id === startGwId);
  return i === -1 ? [] : gameweeks.slice(i);
}

export type Check = { ok: true } | { ok: false; error: string };

export function validateLeagueName(raw: unknown): Check {
  if (typeof raw !== "string") return { ok: false, error: "Name required" };
  const v = raw.trim();
  if (v.length < 3 || v.length > 40) {
    return { ok: false, error: "League name must be 3–40 characters" };
  }
  return { ok: true };
}

export function validateEntryFee(raw: unknown): Check {
  if (typeof raw !== "number" || !Number.isFinite(raw)) {
    return { ok: false, error: "Entry fee required" };
  }
  if (raw < MIN_ENTRY_FEE) {
    return { ok: false, error: `Entry fee must be at least ${MIN_ENTRY_FEE.toLocaleString()} $GOLAZO` };
  }
  if (raw > MAX_ENTRY_FEE) {
    return { ok: false, error: "Entry fee is too large" };
  }
  return { ok: true };
}
