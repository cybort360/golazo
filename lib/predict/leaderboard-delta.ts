// Pure helper for the "leaderboard update moment" (PRD §4 step 8): after a pick
// settles, show how it moved the user on their private leaderboard — e.g.
// "+40 pts · up to #2". Testable, no server-only chain.
import { rankStandings, type RankedMember } from "@/lib/predict/league-util";

export interface RankDelta {
  rank: number; // current rank (after this pick's points)
  previousRank: number; // where the user sat before this pick landed
  memberCount: number;
}

// Re-rank the league as if this pick's points hadn't landed, to recover the
// previous rank. A LOST/VOID pick gains 0 → no movement (previousRank === rank).
export function computeDelta(
  members: RankedMember[],
  youUserId: string,
  pointsGained: number,
): RankDelta | null {
  const you = members.find((m) => m.userId === youUserId);
  if (!you) return null;
  const rank = you.rank;
  if (pointsGained <= 0) return { rank, previousRank: rank, memberCount: members.length };
  const before = rankStandings(
    members.map((m) => (m.userId === youUserId ? { ...m, points: m.points - pointsGained } : m)),
  );
  const previousRank = before.find((m) => m.userId === youUserId)?.rank ?? rank;
  return { rank, previousRank, memberCount: members.length };
}

// Short human label for the movement, e.g. "up to #2", "held #1", "now #3".
export function movementLabel(d: RankDelta): string {
  if (d.previousRank > d.rank) return `up to #${d.rank}`;
  if (d.rank === 1) return "held #1";
  return `now #${d.rank}`;
}
