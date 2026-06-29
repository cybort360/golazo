// Parimutuel math for binary YES/NO markets, in token base units (bigint).
// Zero rake: the winning side splits the entire pool pro-rata.

export type Side = 0 | 1; // 0 = NO, 1 = YES

/**
 * Estimated payout if `side` wins, after adding `stakeAmount` to that side.
 * payout = yourStake * totalPool / winningSideTotal (integer division).
 */
export function estimatePayout(
  side: Side,
  stakeAmount: bigint,
  yesTotal: bigint,
  noTotal: bigint,
): bigint {
  if (stakeAmount <= 0n) return 0n;
  const sideTotalAfter = (side === 1 ? yesTotal : noTotal) + stakeAmount;
  const totalAfter = yesTotal + noTotal + stakeAmount;
  return (stakeAmount * totalAfter) / sideTotalAfter;
}

/** Implied probability (0..1) of a side from current pool weights. */
export function impliedProbability(side: Side, yesTotal: bigint, noTotal: bigint): number {
  const total = yesTotal + noTotal;
  if (total === 0n) return 0.5;
  const sideTotal = side === 1 ? yesTotal : noTotal;
  return Number(sideTotal) / Number(total);
}

/** Decimal odds multiplier for a fresh unit stake on `side` (>= 1). */
export function impliedOdds(side: Side, yesTotal: bigint, noTotal: bigint): number {
  const p = impliedProbability(side, yesTotal, noTotal);
  if (p <= 0) return 0;
  return 1 / p;
}
