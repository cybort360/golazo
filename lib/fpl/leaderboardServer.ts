// Server-side: compute the overall fantasy leaderboard rows on demand. Shared by
// the public board route and the admin Holders-League payouts view so both rank
// identically. Reads only the stats for gameweeks already under way.

import { GAMEWEEKS } from "@/lib/fpl/gameweeks";
import { getPool, getTeamOwnerIds, getTeam, getMatchStats } from "@/lib/fpl/store";
import { buildFantasyLeaderboard, type FantasyRow } from "@/lib/fpl/leaderboard";
import type { FplTeam, PlayerMatchStats } from "@/lib/fpl/types";

export async function computeOverallRows(now: number): Promise<FantasyRow[]> {
  const [pool, ownerIds] = await Promise.all([getPool(), getTeamOwnerIds()]);
  const teams = (await Promise.all(ownerIds.map(getTeam))).filter(
    (t): t is FplTeam => t !== null,
  );

  const matchIds = GAMEWEEKS.filter((g) => g.deadlineMs <= now).flatMap((g) => g.matchIds);
  const statsByMatch: Record<string, PlayerMatchStats[]> = {};
  await Promise.all(
    matchIds.map(async (mid) => {
      statsByMatch[mid] = await getMatchStats(mid);
    }),
  );

  return buildFantasyLeaderboard(teams, pool, statsByMatch, GAMEWEEKS);
}
