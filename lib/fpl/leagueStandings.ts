// Server helper: compute a league's standings + pot breakdown. Shared by the
// public league view and the admin settlement view so both see the same ranking.
// A league ranks its members by fantasy points over its scoring window
// (start gameweek → Final), reusing the main leaderboard builder.

import { GAMEWEEKS } from "@/lib/fpl/gameweeks";
import { getPool, getTeam, getMatchStats } from "@/lib/fpl/store";
import { buildFantasyLeaderboard, type FantasyRow } from "@/lib/fpl/leaderboard";
import { gameweekWindow, potBreakdown, type PotBreakdown } from "@/lib/fpl/league";
import type { FplTeam, League, PlayerMatchStats } from "@/lib/fpl/types";

export async function computeLeagueStandings(
  league: League,
): Promise<{ rows: FantasyRow[]; pot: PotBreakdown }> {
  const window = gameweekWindow(league.startGw, GAMEWEEKS);
  const now = Date.now();
  const matchIds = window.filter((g) => g.deadlineMs <= now).flatMap((g) => g.matchIds);

  const [pool, teams] = await Promise.all([
    getPool(),
    Promise.all(league.members.map((m) => getTeam(m.playerId))),
  ]);
  const memberTeams = teams.filter((t): t is FplTeam => t !== null);

  const statsByMatch: Record<string, PlayerMatchStats[]> = {};
  await Promise.all(
    matchIds.map(async (mid) => {
      statsByMatch[mid] = await getMatchStats(mid);
    }),
  );

  const rows = buildFantasyLeaderboard(memberTeams, pool, statsByMatch, window);
  const pot = potBreakdown(league.entryFee, league.members.length, league.rakeBps);
  return { rows, pot };
}
