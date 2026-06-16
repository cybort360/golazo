// Fee-split constants and display helpers.

// 1 SOL = 1,000,000,000 lamports.
const LAMPORTS_PER_SOL = 1_000_000_000;

export const FEE_SPLIT = {
  prizePool: 0.35,
  buyback: 0.2,
  futureFund: 0.45,
} as const;

export const FUTURE_FUND_SPLIT = {
  nextTournamentSeed: 0.5,
  golazoHolders: 0.3,
  loyaltyDrop: 0.2,
} as const;

export function calculateFeeSplit(totalFees: number): {
  prizePool: number;
  buyback: number;
  futureFund: number;
} {
  return {
    prizePool: totalFees * FEE_SPLIT.prizePool,
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

// "Nice" milestones the prize-pool bar fills toward: 1, 2, 5 × powers of ten,
// reaching down to 0.1 so a small early pool still shows visible movement.
const MILESTONE_STEPS = [1, 2, 5];
const MILESTONE_MIN_MAGNITUDE = 0.1;

/**
 * Self-scaling progress for the prize-pool bar. Returns how full the bar should
 * be (0–1) relative to the next milestone strictly above the current balance,
 * plus that target. As the pool grows past a milestone, the target jumps to the
 * next one — so the bar always reflects real growth without a hardcoded cap.
 * e.g. 0.05 SOL → { ratio: 0.5, target: 0.1 }; 2 SOL → { ratio: 0.4, target: 5 }.
 */
export function prizePoolProgress(sol: number): {
  ratio: number;
  target: number;
} {
  if (!Number.isFinite(sol) || sol <= 0) {
    return { ratio: 0, target: MILESTONE_MIN_MAGNITUDE };
  }
  for (let mag = MILESTONE_MIN_MAGNITUDE; mag <= 1e12; mag *= 10) {
    for (const step of MILESTONE_STEPS) {
      const target = step * mag;
      if (target > sol) return { ratio: sol / target, target };
    }
  }
  // Unreachably large balance: peg the bar full.
  return { ratio: 1, target: sol };
}
