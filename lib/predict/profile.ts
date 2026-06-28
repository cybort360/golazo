import type { ProofReceipt, ProfileStats } from "@/lib/predict/types";

// Human label for a market key (the part before " · " in a receipt's marketLabel).
const MARKET_LABELS: Record<string, string> = {
  total_goals: "Total goals",
  winner: "Match winner",
  btts: "Both teams to score",
  chaos: "Chaos picks",
  corners: "Corners",
};

function marketKey(receipt: ProofReceipt): string {
  return receipt.marketLabel.split(" · ")[0]?.trim() ?? receipt.marketLabel;
}

function marketDisplay(key: string): string {
  return MARKET_LABELS[key] ?? key.replace(/_/g, " ");
}

export interface ProfileIdentity {
  handle: string;       // url-safe, e.g. "jordan"
  displayName: string;  // "Jordan"
  initials: string;     // "JK"
  color: string;        // avatar background hex
  tagline: string;
  globalRank: number | null;
}

// Derive a public profile entirely from settled prediction history. Pure so it
// can be unit-tested and reused once the real data source exists.
export function buildProfile(receipts: ProofReceipt[], identity: ProfileIdentity): ProfileStats {
  const settled = receipts.filter((r) => r.result === "WON" || r.result === "LOST");
  const wins = settled.filter((r) => r.result === "WON").length;
  const totalPicks = settled.length;
  const points = receipts.reduce((sum, r) => sum + r.points, 0);
  const accuracy = totalPicks > 0 ? wins / totalPicks : 0;

  // Current streak: consecutive WONs from most recent settlement backwards.
  const byRecent = [...settled].sort((a, b) => b.settledAtMs - a.settledAtMs);
  let currentStreak = 0;
  for (const r of byRecent) {
    if (r.result === "WON") currentStreak += 1;
    else break;
  }

  // Favorite market: the market key with the most picks (ties → most points).
  const counts: Record<string, { picks: number; points: number }> = {};
  for (const r of settled) {
    const k = marketKey(r);
    const cur = counts[k] ?? { picks: 0, points: 0 };
    counts[k] = { picks: cur.picks + 1, points: cur.points + r.points };
  }
  let favoriteMarket = "—";
  let best = { picks: -1, points: -1 };
  for (const k of Object.keys(counts)) {
    const v = counts[k];
    if (v.picks > best.picks || (v.picks === best.picks && v.points > best.points)) {
      best = v;
      favoriteMarket = marketDisplay(k);
    }
  }

  // Biggest upset called: the highest-scoring won pick.
  const wonByPoints = settled
    .filter((r) => r.result === "WON")
    .sort((a, b) => b.points - a.points);
  const top = wonByPoints[0] ?? null;
  const biggestUpset = top
    ? {
        label: top.predictionLabel,
        detail: `${top.home.ticker} ${top.homeScore}–${top.awayScore} ${top.away.ticker}`,
        points: top.points,
      }
    : null;

  return {
    ...identity,
    accuracy,
    currentStreak,
    totalPicks,
    wins,
    points,
    favoriteMarket,
    biggestUpset,
  };
}
