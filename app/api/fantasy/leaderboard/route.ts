import { NextResponse } from "next/server";
import { GAMEWEEKS } from "@/lib/fpl/gameweeks";
import {
  getPool,
  getTeamOwnerIds,
  getTeam,
  getMatchStats,
} from "@/lib/fpl/store";
import { buildFantasyLeaderboard } from "@/lib/fpl/leaderboard";
import type { FplTeam, PlayerMatchStats } from "@/lib/fpl/types";

export const dynamic = "force-dynamic";

// Public fantasy leaderboard, computed on demand. Reads only the stats for
// gameweeks already under way (others have none), so the work scales with the
// tournament's progress rather than the whole schedule.
export async function GET() {
  const now = Date.now();
  try {
    const [pool, ownerIds] = await Promise.all([getPool(), getTeamOwnerIds()]);
    const teams = (await Promise.all(ownerIds.map(getTeam))).filter(
      (t): t is FplTeam => t !== null,
    );

    const startedGws = GAMEWEEKS.filter((g) => g.deadlineMs <= now);
    const matchIds = startedGws.flatMap((g) => g.matchIds);
    const statsByMatch: Record<string, PlayerMatchStats[]> = {};
    await Promise.all(
      matchIds.map(async (mid) => {
        statsByMatch[mid] = await getMatchStats(mid);
      }),
    );

    const rows = buildFantasyLeaderboard(teams, pool, statsByMatch, GAMEWEEKS);
    return NextResponse.json({ rows });
  } catch {
    return NextResponse.json({ rows: [] });
  }
}
