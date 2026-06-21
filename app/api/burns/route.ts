import { kv } from "@vercel/kv";
import { TEAMS } from "@/constants/teams";
import { GOLAZO_TOKEN } from "@/constants/tokens";
import { fetchTokenSupplies } from "@/lib/solanaSupply";
import { heliusServerRpcUrl } from "@/lib/helius";
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
// Once the cache is this old, refresh even if the single-flight lock looks held
// — a stuck lock or a run of RPC failures must never freeze the cache forever.
const HARD_STALE_MS = 5 * 60_000;
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

/**
 * Refresh on-chain supplies. Normally behind a single-flight lock so concurrent
 * requests don't all hammer the RPC; pass `force` to bypass the lock when the
 * cache is hard-stale, so a stuck lock can't freeze it. Returns null (and logs
 * why) when it can't refresh, leaving the caller on its last good cache.
 */
async function refresh(
  mints: string[],
  now: number,
  force: boolean,
): Promise<SupplyCache | null> {
  // Prefer the server-side Helius key: the NEXT_PUBLIC_ one is origin-locked to
  // the browser and 403s on server-side reads. Fall back to it only if the
  // server key is missing.
  const rpcUrl =
    heliusServerRpcUrl() ?? process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
  if (!rpcUrl) {
    console.error("[burns] no server RPC URL configured — cannot refresh");
    return null;
  }

  if (!force) {
    const gotLock = await kv.set(LOCK_KEY, now, { nx: true, px: LOCK_MS });
    // Another request is already refreshing — it'll write the cache.
    if (gotLock !== "OK") return null;
  }

  // The browser Helius key is origin-restricted; send the site origin so the
  // server-side read is accepted instead of 403'd.
  const origin = process.env.NEXT_PUBLIC_SITE_URL || "https://golazo.fans";

  try {
    const supplies = await fetchTokenSupplies(mints, rpcUrl, origin);
    const byMint: Record<string, number | null> = {};
    for (const mint of mints) byMint[mint] = supplies.get(mint) ?? null;
    const cache: SupplyCache = { fetchedAt: now, byMint };
    await kv.set(CACHE_KEY, cache);
    return cache;
  } catch (err) {
    // RPC down / rate-limited / bad response: keep the last cache, but surface
    // the reason so a persistently frozen feed is diagnosable.
    console.error(
      "[burns] supply refresh failed:",
      err instanceof Error ? err.message : err,
    );
    return null;
  } finally {
    if (!force) await kv.del(LOCK_KEY);
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
  } catch (err) {
    console.error(
      "[burns] cache read failed:",
      err instanceof Error ? err.message : err,
    );
    return Response.json({ burns: [], fetchedAt: 0 });
  }

  const ageMs = cache ? now - cache.fetchedAt : Infinity;
  if (ageMs > STALE_MS) {
    // Past HARD_STALE_MS, bypass the single-flight lock: better a little RPC
    // contention than a feed that's silently stuck for hours.
    const fresh = await refresh(
      tokens.map((t) => t.mint),
      now,
      ageMs > HARD_STALE_MS,
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
