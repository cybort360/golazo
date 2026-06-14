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
import { verifyInitData, telegramPlayerId } from "@/lib/telegramAuth";
import type { MatchResult } from "@/hooks/useMatchResults";

// A player id is a wallet address (web) or "tg:<id>" (Telegram). The KV key
// functions take that id; the param name is generic.
export const PLAYERS_KEY = "pred:players";
export const playerKey = (id: string) => `pred:player:${id}`;
export const nickKey = (nickname: string) =>
  `pred:nick:${nickname.toLowerCase()}`;
export const tokenKey = (token: string) => `pred:token:${token}`;
export const picksKey = (id: string) => `pred:picks:${id}`;
// Match ids the player has locked: those picks can no longer be changed.
export const lockedKey = (id: string) => `pred:locked:${id}`;
// Short-lived, single-use token minting a Telegram player's id for the
// browser-side wallet-link hand-off: linkKey(token) -> player id.
export const linkKey = (token: string) => `pred:link:${token}`;
// Reverse index enforcing one wallet ↔ one account: walletLinkKey(wallet) -> id.
export const walletLinkKey = (wallet: string) => `pred:wallet:${wallet}`;

/**
 * Resolve the player making a write request, accepting either auth scheme:
 * a web registration token (Authorization: Bearer) or a Telegram Mini App
 * payload (X-Telegram-Init-Data). Returns the player id, or null if neither
 * verifies.
 */
export async function resolvePlayerId(request: Request): Promise<string | null> {
  const initData = request.headers.get("x-telegram-init-data");
  if (initData) {
    const user = verifyInitData(initData);
    return user ? telegramPlayerId(user.id) : null;
  }
  const token = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");
  if (token) {
    try {
      return (await kv.get<string>(tokenKey(token))) ?? null;
    } catch {
      return null;
    }
  }
  return null;
}

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
    const ids = (await kv.get<string[]>(PLAYERS_KEY)) ?? [];
    const entries = await Promise.all(
      ids.map(async (id) => {
        const [player, picks] = await Promise.all([
          kv.get<Player>(playerKey(id)),
          kv.get<Record<string, string>>(picksKey(id)),
        ]);
        return { id, player, picks };
      }),
    );

    const players: Player[] = [];
    const picksById: Record<string, Record<string, string>> = {};
    for (const e of entries) {
      if (!e.player) continue;
      // Backfill id/wallet for records written before the unified-id change:
      // a web player's id is its wallet; a Telegram player has no wallet yet.
      players.push({
        ...e.player,
        id: e.id,
        wallet: e.player.wallet ?? (e.id.startsWith("tg:") ? null : e.id),
      });
      picksById[e.id] = e.picks ?? {};
    }

    const results = (await kv.get<MatchResult[]>("match_results")) ?? [];
    const built = buildLeaderboards(players, picksById, results);
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
