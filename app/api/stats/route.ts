import { kv } from "@vercel/kv";
import { TEAMS } from "@/constants/teams";
import { GOLAZO_TOKEN } from "@/constants/tokens";
import { getMultipleTokenPrices } from "@/lib/dexscreener";
import type { WeeklyPrize } from "@/lib/weeklyPrize";

export const dynamic = "force-dynamic";

const CACHE_KEY = "stats_cache";
const STALE_MS = 5 * 60 * 1000;

interface Payout {
  week: number;
  team: string | null;
  sol: number;
  tx: string;
}
interface Stats {
  totalVolume24h: number;
  recentPayouts: Payout[];
  biggestPayouts: Payout[];
}
interface Cached extends Stats {
  fetchedAt: number;
}

interface TokenOverride {
  address?: string;
}

async function kvGet<T>(key: string): Promise<T | null> {
  try {
    return (await kv.get<T>(key)) ?? null;
  } catch {
    return null;
  }
}

/** Every launched token address (admin overrides win over the static defaults). */
async function tokenAddresses(): Promise<string[]> {
  const overrides = (await kvGet<Record<string, TokenOverride>>("token_addresses")) ?? {};
  const out: string[] = [];
  for (const t of TEAMS) {
    const addr = overrides[t.ticker]?.address?.trim() || t.tokenAddress;
    if (addr) out.push(addr);
  }
  const golazo = overrides[GOLAZO_TOKEN.ticker]?.address?.trim() || GOLAZO_TOKEN.address;
  if (golazo) out.push(golazo);
  return out;
}

async function compute(): Promise<Stats> {
  const addresses = await tokenAddresses();
  const prices = addresses.length ? await getMultipleTokenPrices(addresses) : new Map();
  let totalVolume24h = 0;
  prices.forEach((p) => (totalVolume24h += p.volume24h));

  const history = (await kvGet<WeeklyPrize[]>("weekly_prize_history")) ?? [];
  const paid: Payout[] = history
    .filter((h) => h.status === "paid" && h.txHash && h.potSol > 0)
    .map((h) => ({ week: h.week, team: h.winnerTeamId, sol: h.potSol, tx: h.txHash as string }));

  const recentPayouts = [...paid].sort((a, b) => b.week - a.week).slice(0, 6);
  const biggestPayouts = [...paid].sort((a, b) => b.sol - a.sol).slice(0, 6);

  return { totalVolume24h, recentPayouts, biggestPayouts };
}

export async function GET() {
  const cached = await kvGet<Cached>(CACHE_KEY);
  if (cached && Date.now() - cached.fetchedAt <= STALE_MS) {
    return Response.json(cached);
  }
  const stats = await compute();
  try {
    await kv.set(CACHE_KEY, { ...stats, fetchedAt: Date.now() });
  } catch {
    /* fine without the cache */
  }
  return Response.json(stats);
}
