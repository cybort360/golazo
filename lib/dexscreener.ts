// DexScreener API client. The single source of all price data for the site.
// No wallet adapter, no Helius. Every function degrades gracefully and never throws.

const BASE_URL = "https://api.dexscreener.com/latest/dex";

// Wrapped SOL mint, used to read the live SOL/USD price.
const WSOL_MINT = "So11111111111111111111111111111111111111112";

// DexScreener accepts at most 30 comma-separated addresses per request.
const MAX_BATCH = 30;

export interface TokenPrice {
  address: string;
  priceUsd: string;
  priceNative: string; // price in SOL
  volume24h: number;
  priceChange24h: number;
  liquidity: number;
  marketCap: number;
  fdv: number;
  pairAddress: string;
  imageUrl?: string; // token logo from DexScreener, when available
}

// ── Raw DexScreener response shapes (only the fields we consume) ──────────────
interface RawToken {
  address: string;
  name?: string;
  symbol?: string;
}

interface RawPair {
  pairAddress: string;
  baseToken: RawToken;
  quoteToken: RawToken;
  priceUsd?: string;
  priceNative?: string;
  volume?: { h24?: number };
  priceChange?: { h24?: number };
  liquidity?: { usd?: number };
  marketCap?: number;
  fdv?: number;
  info?: { imageUrl?: string };
}

interface RawTokensResponse {
  pairs: RawPair[] | null;
}

/** Liquidity (USD) of a pair, defaulting to 0 so it can always be compared. */
function pairLiquidity(pair: RawPair): number {
  return pair.liquidity?.usd ?? 0;
}

/** Map a raw DexScreener pair to our public TokenPrice shape. */
function toTokenPrice(pair: RawPair): TokenPrice {
  return {
    address: pair.baseToken.address,
    priceUsd: pair.priceUsd ?? "0",
    priceNative: pair.priceNative ?? "0",
    volume24h: pair.volume?.h24 ?? 0,
    priceChange24h: pair.priceChange?.h24 ?? 0,
    liquidity: pairLiquidity(pair),
    marketCap: pair.marketCap ?? 0,
    fdv: pair.fdv ?? 0,
    pairAddress: pair.pairAddress,
    imageUrl: pair.info?.imageUrl,
  };
}

/**
 * Fetch the /tokens endpoint for one or more addresses.
 * Returns an empty array on any failure (network, non-2xx, bad JSON).
 */
async function fetchPairs(addresses: string): Promise<RawPair[]> {
  try {
    const res = await fetch(`${BASE_URL}/tokens/${addresses}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = (await res.json()) as RawTokensResponse;
    return Array.isArray(data.pairs) ? data.pairs : [];
  } catch {
    return [];
  }
}

/**
 * Reduce a list of pairs to the most liquid pair per base-token address.
 * Keyed by the base token's mint address.
 */
function bestPairByAddress(pairs: RawPair[]): Map<string, RawPair> {
  const best = new Map<string, RawPair>();
  for (const pair of pairs) {
    const key = pair.baseToken?.address;
    if (!key) continue;
    const current = best.get(key);
    if (!current || pairLiquidity(pair) > pairLiquidity(current)) {
      best.set(key, pair);
    }
  }
  return best;
}

/** Split an array into fixed-size chunks. */
function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

/**
 * Price for a single token.
 * Returns null if the token is not found / not yet listed on DexScreener,
 * or if the request fails for any reason.
 */
export async function getTokenPrice(
  mintAddress: string,
): Promise<TokenPrice | null> {
  const pairs = await fetchPairs(mintAddress);
  if (pairs.length === 0) return null;

  // Prefer the pair whose base token is the one we asked for; if none match
  // exactly, fall back to the most liquid pair returned.
  const matching = pairs.filter((p) => p.baseToken?.address === mintAddress);
  const pool = matching.length > 0 ? matching : pairs;

  let best: RawPair | null = null;
  for (const pair of pool) {
    if (!best || pairLiquidity(pair) > pairLiquidity(best)) best = pair;
  }
  return best ? toTokenPrice(best) : null;
}

/**
 * Batch price lookup. Accepts any number of addresses, chunking into requests
 * of 30 (the DexScreener limit). Returns a Map keyed by mint address;
 * addresses with no listing are simply absent (nulls filtered out).
 */
export async function getMultipleTokenPrices(
  mintAddresses: string[],
): Promise<Map<string, TokenPrice>> {
  const result = new Map<string, TokenPrice>();
  if (mintAddresses.length === 0) return result;

  const requested = new Set(mintAddresses);
  const batches = chunk(mintAddresses, MAX_BATCH);

  const responses = await Promise.all(
    batches.map((batch) => fetchPairs(batch.join(","))),
  );

  const allPairs = responses.flat();
  const best = bestPairByAddress(allPairs);

  best.forEach((pair, address) => {
    // Only surface addresses the caller actually asked for.
    if (requested.has(address)) {
      result.set(address, toTokenPrice(pair));
    }
  });
  return result;
}

/**
 * Live SOL price in USD, read from the most liquid wrapped-SOL pair.
 * Used to convert the prize-pool SOL balance to USD. Returns null on failure.
 */
export async function getSOLPriceUSD(): Promise<number | null> {
  const price = await getTokenPrice(WSOL_MINT);
  if (!price) return null;

  const usd = Number.parseFloat(price.priceUsd);
  return Number.isFinite(usd) && usd > 0 ? usd : null;
}
