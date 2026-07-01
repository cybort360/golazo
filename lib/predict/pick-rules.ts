import type { MarketId, MatchState } from "@/lib/predict/types";

// Pure pick-flow rules (kept out of the server-only chain so they're testable).

export const MARKET_IDS: MarketId[] = ["winner", "totals", "btts", "chaos"];

// Human titles per market, kept client-safe (types-only module) so both the pick
// screens and the "My Picks" builder can label a pick without building a Match.
export const MARKET_TITLES: Record<MarketId, string> = {
  winner: "Match winner",
  totals: "Total goals · 2.5",
  btts: "Both teams to score",
  chaos: "Chaos Pick",
};

export function isMarketId(v: string): v is MarketId {
  return (MARKET_IDS as string[]).includes(v);
}

/** Map stored pick rows into the pick screen's selection state (by market). */
export function existingPicksToState(
  picks: { marketId: string; optionId: string }[],
): Partial<Record<MarketId, string>> {
  const out: Partial<Record<MarketId, string>> = {};
  for (const p of picks) if (isMarketId(p.marketId)) out[p.marketId] = p.optionId;
  return out;
}

/**
 * Picks are open only while the match hasn't kicked off: before the lock time
 * AND while the state is still NOT_STARTED. Once the match is LIVE/HT/FT (or a
 * terminal state) it's locked regardless of the scheduled lock time — a real
 * kickoff can drift from the scheduled one. Unknown lock → time gate is open.
 */
export function isPickOpen(
  lockAtMs: number | null,
  nowMs: number,
  state: MatchState = "NOT_STARTED",
): boolean {
  if (state !== "NOT_STARTED") return false;
  if (lockAtMs == null) return true;
  return nowMs < lockAtMs;
}
