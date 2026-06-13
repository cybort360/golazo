import { kv } from "@vercel/kv";
import { TEAMS } from "@/constants/teams";
import { GOLAZO_TOKEN } from "@/constants/tokens";
import { fetchTokenSupplies } from "@/lib/solanaSupply";
import { computeBurnPct, type BurnStat } from "@/lib/burns";

// Reads on-chain supplies on demand and caches them in KV; never prerender.
export const dynamic = "force-dynamic";

interface TokenOverride {
  address: string;
  meteoraUrl: string;
  axiomUrl: string;
}

interface SupplyCache {
  fetchedAt: number;
  byMint: Record<string, number | null>;
}

// Supply moves slowly (only on a burn), so a minute-old read is plenty fresh.
const STALE_MS = 60_000;
const LOCK_MS = 10_000;
const CACHE_KEY = "burn_supplies";
const LOCK_KEY = "burn_lock";

function clean(value: string | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Launched tokens (ticker + mint), resolving admin-set addresses over the
 * static defaults — the same source of truth as /api/tokens. Includes the
 * platform token. Tokens with no address are simply absent.
 */
async function resolveLaunchedTokens(): Promise<
  { ticker: string; mint: string }[]
> {
  let overrides: Record<string, TokenOverride> = {};
  try {
    overrides =
      (await kv.get<Record<string, TokenOverride>>("token_addresses")) ?? {};
  } catch {
    overrides = {};
  }

  const out: { ticker: string; mint: string }[] = [];
  for (const t of TEAMS) {
    const mint = clean(overrides[t.ticker]?.address) ?? t.tokenAddress;
    if (mint) out.push({ ticker: t.ticker, mint });
  }
  const golazoMint =
    clean(overrides[GOLAZO_TOKEN.ticker]?.address) ?? GOLAZO_TOKEN.address;
  if (golazoMint) out.push({ ticker: GOLAZO_TOKEN.ticker, mint: golazoMint });
  return out;
}

/** Refresh on-chain supplies behind a single-flight lock. Null if it can't. */
async function refresh(
  mints: string[],
  now: number,
): Promise<SupplyCache | null> {
  const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
  if (!rpcUrl) return null;

  const gotLock = await kv.set(LOCK_KEY, now, { nx: true, px: LOCK_MS });
  if (gotLock !== "OK") return null;

  try {
    const supplies = await fetchTokenSupplies(mints, rpcUrl);
    const byMint: Record<string, number | null> = {};
    for (const mint of mints) byMint[mint] = supplies.get(mint) ?? null;
    const cache: SupplyCache = { fetchedAt: now, byMint };
    await kv.set(CACHE_KEY, cache);
    return cache;
  } catch {
    return null; // RPC down / rate-limited: keep the last cache
  } finally {
    await kv.del(LOCK_KEY);
  }
}

export async function GET() {
  const now = Date.now();

  const tokens = await resolveLaunchedTokens();
  if (tokens.length === 0) {
    return Response.json({ burns: [], fetchedAt: 0 });
  }

  let cache: SupplyCache | null = null;
  try {
    cache = await kv.get<SupplyCache>(CACHE_KEY);
  } catch {
    return Response.json({ burns: [], fetchedAt: 0 });
  }

  const stale = !cache || now - cache.fetchedAt > STALE_MS;
  if (stale) {
    const fresh = await refresh(
      tokens.map((t) => t.mint),
      now,
    );
    if (fresh) cache = fresh;
  }

  const byMint = cache?.byMint ?? {};
  const burns: BurnStat[] = tokens
    .map(({ ticker, mint }) => {
      const supply = byMint[mint] ?? null;
      const percentBurned = computeBurnPct(supply);
      if (percentBurned === null || supply === null) return null;
      return { ticker, percentBurned, currentSupply: supply };
    })
    .filter((b): b is BurnStat => b !== null)
    .sort((a, b) => b.percentBurned - a.percentBurned);

  return Response.json({ burns, fetchedAt: cache?.fetchedAt ?? 0 });
}
