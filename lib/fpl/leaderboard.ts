// Pure fantasy leaderboard: roll each manager's per-gameweek lineup scores (less
// transfer hits) into a season total and a per-gameweek breakdown. Takes already
// fetched teams, the pool, and per-match stats — no IO — so it's fully testable.

import type { FplPlayer, FplTeam, Gameweek, PlayerMatchStats } from "@/lib/fpl/types";
import { scoreLineup, aggregateByPlayer } from "@/lib/fpl/scoring";
import { transferCost } from "@/lib/fpl/squad";

export interface FantasyRow {
  playerId: string;
  name: string;
  points: number; // season total, net of transfer hits
  gwPoints: Record<string, number>;
}

export function buildFantasyLeaderboard(
  teams: FplTeam[],
  pool: FplPlayer[],
  statsByMatch: Record<string, PlayerMatchStats[]>,
  gameweeks: Gameweek[],
): FantasyRow[] {
  const positionOf = (() => {
    const byId = new Map(pool.map((p) => [p.id, p.position]));
    return (id: string) => byId.get(id);
  })();

  // Aggregate each gameweek's player stats once, shared across all managers.
  const statsByGw: Record<string, Record<string, PlayerMatchStats>> = {};
  for (const gw of gameweeks) {
    const lists = gw.matchIds.map((mid) => statsByMatch[mid] ?? []);
    statsByGw[gw.id] = aggregateByPlayer(lists);
  }

  const rows: FantasyRow[] = teams.map((team) => {
    const gwPoints: Record<string, number> = {};
    let total = 0;
    for (const gw of gameweeks) {
      const lineup = team.lineups[gw.id];
      if (!lineup) continue; // no team fielded that gameweek
      const { total: raw } = scoreLineup(lineup, positionOf, statsByGw[gw.id]);
      const hit = transferCost(team.transfersByGw?.[gw.id] ?? 0);
      const net = raw - hit;
      gwPoints[gw.id] = net;
      total += net;
    }
    return { playerId: team.playerId, name: team.name, points: total, gwPoints };
  });

  return rows.sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
}
