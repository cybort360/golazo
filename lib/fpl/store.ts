// KV wiring for the fantasy game: the player pool, each manager's team, raw
// per-match player stats, and a cached leaderboard. Keeps routes thin and is the
// one place that knows the key layout. Degrades rather than throwing where a
// caller can sensibly continue.

import { randomInt } from "crypto";
import { kv } from "@vercel/kv";
import type { FplPlayer, FplTeam, League, PlayerMatchStats } from "@/lib/fpl/types";

export const POOL_KEY = "fpl:players";
export const TEAMS_INDEX_KEY = "fpl:teams"; // playerIds that have a team
export const teamKey = (playerId: string) => `fpl:team:${playerId}`;
export const statsKey = (matchId: string) => `fpl:stats:${matchId}`;
export const LEADERBOARD_KEY = "fpl:leaderboard";

/** The priced player pool, or [] if it hasn't been synced yet. With
 *  FANTASY_DEV_POOL=1 (local only) falls back to a synthetic pool so the UI is
 *  usable without the paid feed. */
export async function getPool(): Promise<FplPlayer[]> {
  let pool: FplPlayer[] = [];
  try {
    pool = (await kv.get<FplPlayer[]>(POOL_KEY)) ?? [];
  } catch {
    pool = [];
  }
  if (pool.length === 0 && process.env.FANTASY_DEV_POOL === "1") {
    const { devPool } = await import("@/lib/fpl/devPool");
    return devPool();
  }
  return pool;
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

// ── Private leagues ─────────────────────────────────────────────────────────

export const leagueKey = (code: string) => `fpl:league:${code}`;
export const ALL_LEAGUES_KEY = "fpl:leagues:all";
export const playerLeaguesKey = (playerId: string) => `fpl:leagues:${playerId}`;

// Ambiguous-character-free alphabet for human-shareable codes.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateLeagueCode(len = 6): string {
  // CSPRNG (randomInt is unbiased) so private-league codes can't be predicted
  // or enumerated to discover/peek at leagues.
  let s = "";
  for (let i = 0; i < len; i++) s += CODE_ALPHABET[randomInt(0, CODE_ALPHABET.length)];
  return s;
}

export async function getLeague(code: string): Promise<League | null> {
  try {
    return (await kv.get<League>(leagueKey(code.toUpperCase()))) ?? null;
  } catch {
    return null;
  }
}

export async function saveLeague(league: League): Promise<void> {
  await kv.set(leagueKey(league.code), league);
  const all = (await kv.get<string[]>(ALL_LEAGUES_KEY)) ?? [];
  if (!all.includes(league.code)) await kv.set(ALL_LEAGUES_KEY, [...all, league.code]);
}

/** Record that a player belongs to a league (idempotent). */
export async function indexPlayerLeague(playerId: string, code: string): Promise<void> {
  const codes = (await kv.get<string[]>(playerLeaguesKey(playerId))) ?? [];
  if (!codes.includes(code)) await kv.set(playerLeaguesKey(playerId), [...codes, code]);
}

export async function getPlayerLeagueCodes(playerId: string): Promise<string[]> {
  try {
    return (await kv.get<string[]>(playerLeaguesKey(playerId))) ?? [];
  } catch {
    return [];
  }
}

export async function getAllLeagueCodes(): Promise<string[]> {
  try {
    return (await kv.get<string[]>(ALL_LEAGUES_KEY)) ?? [];
  } catch {
    return [];
  }
}

// One entry-payment signature can only ever be used once — across all leagues —
// so a single on-chain payment can't buy multiple entries.
const usedSigKey = (sig: string) => `fpl:usedsig:${sig}`;

export async function isEntryTxUsed(sig: string): Promise<boolean> {
  try {
    return (await kv.get<number>(usedSigKey(sig))) !== null;
  } catch {
    return false;
  }
}

export async function markEntryTxUsed(sig: string): Promise<void> {
  await kv.set(usedSigKey(sig), Date.now());
}

// ── Holders League prize pots (platform-funded, in $GOLAZO) ──────────────────

export const SEASON_POT_KEY = "fpl:pot:season";
export const weeklyPotKey = (gwId: string) => `fpl:pot:gw:${gwId}`;

export async function getSeasonPot(): Promise<number> {
  try {
    return (await kv.get<number>(SEASON_POT_KEY)) ?? 0;
  } catch {
    return 0;
  }
}

export async function getWeeklyPot(gwId: string): Promise<number> {
  try {
    return (await kv.get<number>(weeklyPotKey(gwId))) ?? 0;
  } catch {
    return 0;
  }
}

export async function setSeasonPot(amount: number): Promise<void> {
  await kv.set(SEASON_POT_KEY, amount);
}

export async function setWeeklyPot(gwId: string, amount: number): Promise<void> {
  await kv.set(weeklyPotKey(gwId), amount);
}
