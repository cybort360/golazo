import type { MarketId } from "@/lib/predict/types";

// Pure pick-flow rules (kept out of the server-only chain so they're testable).

export const MARKET_IDS: MarketId[] = ["winner", "totals", "btts", "chaos"];

export function isMarketId(v: string): v is MarketId {
  return (MARKET_IDS as string[]).includes(v);
}

/** Picks are open until the lock time. Unknown lock → treat as open. */
export function isPickOpen(lockAtMs: number | null, nowMs: number): boolean {
  if (lockAtMs == null) return true;
  return nowMs < lockAtMs;
}
