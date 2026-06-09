// Fee-split constants and display helpers.

// 1 SOL = 1,000,000,000 lamports.
const LAMPORTS_PER_SOL = 1_000_000_000;

export const FEE_SPLIT = {
  prizePool: 0.35,
  team: 0.25,
  buyback: 0.2,
  futureFund: 0.2,
} as const;

export const FUTURE_FUND_SPLIT = {
  nextTournamentSeed: 0.5,
  golazoHolders: 0.3,
  loyaltyDrop: 0.2,
} as const;

export function calculateFeeSplit(totalFees: number): {
  prizePool: number;
  team: number;
  buyback: number;
  futureFund: number;
} {
  return {
    prizePool: totalFees * FEE_SPLIT.prizePool,
    team: totalFees * FEE_SPLIT.team,
    buyback: totalFees * FEE_SPLIT.buyback,
    futureFund: totalFees * FEE_SPLIT.futureFund,
  };
}

/**
 * Convert lamports to a display string with 2 decimal places.
 * e.g. 1_420_000_000 → "1.42 SOL"
 */
export function formatSOL(lamports: number): string {
  const sol = lamports / LAMPORTS_PER_SOL;
  return `${sol.toFixed(2)} SOL`;
}
