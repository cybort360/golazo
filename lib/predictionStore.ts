// KV-wired helpers for the prediction game. Keeps the routes thin and gives the
// leaderboard one cached builder shared by the public board and the admin
// payout view.

import { kv } from "@vercel/kv";
import {
  buildLeaderboards,
  weekOf,
  type Leaderboards,
  type Player,
} from "@/lib/predictions";
import type { MatchResult } from "@/hooks/useMatchResults";

export const PLAYERS_KEY = "pred:players";
export const playerKey = (wallet: string) => `pred:player:${wallet}`;
export const nickKey = (nickname: string) =>
  `pred:nick:${nickname.toLowerCase()}`;
export const tokenKey = (token: string) => `pred:token:${token}`;
export const picksKey = (wallet: string) => `pred:picks:${wallet}`;

const CACHE_KEY = "pred_leaderboard";
const LOCK_KEY = "pred_lb_lock";
const STALE_MS = 60_000;
const LOCK_MS = 15_000;

interface LeaderboardCache extends Leaderboards {
  fetchedAt: number;
}

/** Recompute the leaderboards from every player's picks behind a lock. */
async function rebuild(now: number): Promise<LeaderboardCache | null> {
  let gotLock: unknown;
  try {
    gotLock = await kv.set(LOCK_KEY, now, { nx: true, px: LOCK_MS });
  } catch {
    return null;
  }
  if (gotLock !== "OK") return null;

  try {
    const wallets = (await kv.get<string[]>(PLAYERS_KEY)) ?? [];
    const entries = await Promise.all(
      wallets.map(async (w) => {
        const [player, picks] = await Promise.all([
          kv.get<Player>(playerKey(w)),
          kv.get<Record<string, string>>(picksKey(w)),
        ]);
        return { wallet: w, player, picks };
      }),
    );

    const players: Player[] = [];
    const picksByWallet: Record<string, Record<string, string>> = {};
    for (const e of entries) {
      if (!e.player) continue;
      players.push(e.player);
      picksByWallet[e.wallet] = e.picks ?? {};
    }

    const results = (await kv.get<MatchResult[]>("match_results")) ?? [];
    const built = buildLeaderboards(players, picksByWallet, results);
    const cache: LeaderboardCache = { ...built, fetchedAt: now };
    await kv.set(CACHE_KEY, cache);
    return cache;
  } catch {
    return null;
  } finally {
    try {
      await kv.del(LOCK_KEY);
    } catch {
      /* ignore */
    }
  }
}

/** Cached leaderboards, refreshed on demand. Degrades to empty on KV failure. */
export async function getCachedLeaderboards(): Promise<Leaderboards> {
  let cache: LeaderboardCache | null = null;
  try {
    cache = await kv.get<LeaderboardCache>(CACHE_KEY);
  } catch {
    return { season: [], weeks: {} };
  }
  const now = Date.now();
  if (cache && now - cache.fetchedAt <= STALE_MS) return cache;
  const fresh = await rebuild(now);
  return fresh ?? cache ?? { season: [], weeks: {} };
}

/** Today's ISO week key in Eastern Time (matches how fixtures are bucketed). */
export function currentWeekKeyEt(): string {
  const etDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return weekOf(etDate);
}
