// KV wiring for the fantasy game: the player pool, each manager's team, raw
// per-match player stats, and a cached leaderboard. Keeps routes thin and is the
// one place that knows the key layout. Degrades rather than throwing where a
// caller can sensibly continue.

import { kv } from "@vercel/kv";
import type { FplPlayer, FplTeam, PlayerMatchStats } from "@/lib/fpl/types";

export const POOL_KEY = "fpl:players";
export const TEAMS_INDEX_KEY = "fpl:teams"; // playerIds that have a team
export const teamKey = (playerId: string) => `fpl:team:${playerId}`;
export const statsKey = (matchId: string) => `fpl:stats:${matchId}`;
export const LEADERBOARD_KEY = "fpl:leaderboard";

/** The priced player pool, or [] if it hasn't been synced yet. */
export async function getPool(): Promise<FplPlayer[]> {
  try {
    return (await kv.get<FplPlayer[]>(POOL_KEY)) ?? [];
  } catch {
    return [];
  }
}

export async function setPool(pool: FplPlayer[]): Promise<void> {
  await kv.set(POOL_KEY, pool);
}

/** id → player map for fast lookup/validation; built from a pool snapshot. */
export function poolLookup(pool: FplPlayer[]): (id: string) => FplPlayer | undefined {
  const byId = new Map(pool.map((p) => [p.id, p]));
  return (id) => byId.get(id);
}

export async function getTeam(playerId: string): Promise<FplTeam | null> {
  try {
    return (await kv.get<FplTeam>(teamKey(playerId))) ?? null;
  } catch {
    return null;
  }
}

/** Persist a team and ensure the owner is in the teams index (idempotent). */
export async function saveTeam(team: FplTeam): Promise<void> {
  await kv.set(teamKey(team.playerId), team);
  const ids = (await kv.get<string[]>(TEAMS_INDEX_KEY)) ?? [];
  if (!ids.includes(team.playerId)) {
    await kv.set(TEAMS_INDEX_KEY, [...ids, team.playerId]);
  }
}

export async function getTeamOwnerIds(): Promise<string[]> {
  try {
    return (await kv.get<string[]>(TEAMS_INDEX_KEY)) ?? [];
  } catch {
    return [];
  }
}

export async function getMatchStats(matchId: string): Promise<PlayerMatchStats[]> {
  try {
    return (await kv.get<PlayerMatchStats[]>(statsKey(matchId))) ?? [];
  } catch {
    return [];
  }
}

export async function setMatchStats(
  matchId: string,
  stats: PlayerMatchStats[],
): Promise<void> {
  await kv.set(statsKey(matchId), stats);
}
