import type { ProofReceipt, Badge } from "@/lib/predict/types";

function marketKey(r: ProofReceipt): string {
  return r.marketLabel.split(" · ")[0]?.trim() ?? r.marketLabel;
}

// Longest run of consecutive WONs anywhere in settlement history (chronological).
function longestStreak(settled: ProofReceipt[]): number {
  const chrono = [...settled].sort((a, b) => a.settledAtMs - b.settledAtMs);
  let best = 0;
  let run = 0;
  for (const r of chrono) {
    if (r.result === "WON") {
      run += 1;
      best = Math.max(best, run);
    } else {
      run = 0;
    }
  }
  return best;
}

// Derive the player's earned/locked badges purely from prediction history so it
// is testable and reusable once the real data source exists. Badges map to the
// live markets (winner / totals / btts / chaos).
export function buildBadges(receipts: ProofReceipt[]): Badge[] {
  const settled = receipts.filter((r) => r.result === "WON" || r.result === "LOST");
  const won = settled.filter((r) => r.result === "WON");

  const chaosWins = won.filter((r) => marketKey(r) === "chaos").length;
  const totalsWins = won.filter((r) => marketKey(r) === "total_goals").length;
  const cleanSheetWins = won.filter((r) => r.homeScore === 0 || r.awayScore === 0).length;
  const topUpsetPoints = won.reduce((max, r) => Math.max(max, r.points), 0);
  const streak = longestStreak(settled);
  const accuracy = settled.length > 0 ? won.length / settled.length : 0;

  const make = (
    id: string,
    name: string,
    icon: string,
    description: string,
    earned: boolean,
    progress?: { current: number; target: number },
  ): Badge => ({ id, name, icon, description, earned, progress: progress ?? null });

  return [
    make("chaos_king", "Chaos King", "👑", "Win a Chaos pick", chaosWins >= 1),
    make("underdog_prophet", "Underdog Prophet", "🔮", "Win a high-reward pick (80+ pts)", topUpsetPoints >= 80),
    make("clean_sheet_demon", "Clean Sheet Demon", "🧤", "Call a match that ends in a clean sheet", cleanSheetWins >= 1),
    make("sharpshooter", "Sharpshooter", "🎯", "Hit 75%+ accuracy (3+ settled)",
      settled.length >= 3 && accuracy >= 0.75,
      { current: Math.round(accuracy * 100), target: 75 }),
    make("goal_machine", "Goal Machine", "⚽", "Win 3 Total Goals picks",
      totalsWins >= 3, { current: totalsWins, target: 3 }),
    make("on_fire", "On Fire", "🔥", "Reach a 3-pick winning streak",
      streak >= 3, { current: streak, target: 3 }),
  ];
}
