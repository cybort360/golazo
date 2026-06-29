import { hashLeaf, buildTree, proofFor } from "@/lib/txline/merkle";

// TxLINE stat keys. A YES/NO market's `market_id` is one of these keys; the
// settled `claimedValue` is the winning side index (0 = NO, 1 = YES) for binary
// markets, or the resolved category for multi-value stats.
export const STAT_KEYS = {
  winner: "winner", // 0=home,1=draw,2=away (also reused as YES/NO "home win?": 0=no,1=yes)
  totals: "total_goals_over25", // 1=over (YES), 0=under (NO)
  btts: "btts", // 1=yes, 0=no
  chaos: "goal_after_80", // 1=yes, 0=no
} as const;

export type StatKey = (typeof STAT_KEYS)[keyof typeof STAT_KEYS];

function ordered(stats: Record<string, bigint>): string[] {
  return Object.keys(stats).sort();
}

export function buildMatchProof(matchId: string, stats: Record<string, bigint>) {
  const orderedKeys = ordered(stats);
  const leaves = orderedKeys.map((k) => hashLeaf(matchId, k, stats[k]));
  const { root } = buildTree(leaves);
  return { root, leaves, orderedKeys };
}

export function proofForStat(matchId: string, stats: Record<string, bigint>, statKey: string) {
  const orderedKeys = ordered(stats);
  const idx = orderedKeys.indexOf(statKey);
  if (idx === -1) throw new Error(`txline proof: unknown stat ${statKey}`);
  const leaves = orderedKeys.map((k) => hashLeaf(matchId, k, stats[k]));
  const { root } = buildTree(leaves);
  return { claimedValue: stats[statKey], proof: proofFor(leaves, idx), root };
}
