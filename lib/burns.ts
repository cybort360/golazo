// Burn / deflation tracking. Each team token is launched with the same fixed
// supply; buy-and-burns are real SPL burns, so a token's live on-chain supply
// only falls over time. "Percent burned" is how far it has fallen from launch.
//
// Pure and dependency-free so it's trivially testable; the on-chain reads live
// in lib/solanaSupply.ts and the caching in app/api/burns.

// Standard launch supply for every token (1,000,000,000). One-line config: if a
// future competition launches tokens at a different supply, change it here.
export const BURN_INITIAL_SUPPLY = 1_000_000_000;

export interface BurnStat {
  ticker: string;
  percentBurned: number; // 0..100
  currentSupply: number; // ui amount (decimal-adjusted)
}

/**
 * Percent of the initial supply that has been burned, given the current live
 * supply. Returns null when supply is unknown (RPC miss) so callers can omit
 * the token rather than show a wrong figure. Clamped to [0, 100] to stay sane
 * if an RPC hiccup reports more than the initial supply.
 */
export function computeBurnPct(
  currentSupply: number | null,
  initialSupply: number = BURN_INITIAL_SUPPLY,
): number | null {
  if (
    currentSupply === null ||
    !Number.isFinite(currentSupply) ||
    initialSupply <= 0
  ) {
    return null;
  }
  const pct = ((initialSupply - currentSupply) / initialSupply) * 100;
  return Math.min(100, Math.max(0, pct));
}
