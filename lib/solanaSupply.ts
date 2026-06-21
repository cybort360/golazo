// Reads SPL token supplies from a Solana RPC, one request per mint. Returns the
// ui (decimal-adjusted) supply per mint; a per-mint missing/invalid value
// resolves to null rather than failing the batch. Throws only on a
// transport-level failure (non-200, network) so the caller can fall back to its
// last cached snapshot.
//
// One request per mint, not JSON-RPC batching: the configured Helius key is on
// the free plan, which rejects batch (array) requests. `origin`, when set, adds
// the Origin header so an origin-restricted key accepts the server-side call
// (the browser key is locked to the site's domain and 403s without it).

interface RpcSupplyResponse {
  result?: { value?: { uiAmount?: number | null } };
  error?: unknown;
}

export async function fetchTokenSupplies(
  mints: string[],
  rpcUrl: string,
  origin?: string,
): Promise<Map<string, number | null>> {
  const out = new Map<string, number | null>();
  if (mints.length === 0) return out;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (origin) headers.Origin = origin;

  // Sequential to stay within free-plan rate limits. The result is cached for a
  // minute, so a few hundred ms per launched token is fine.
  for (const mint of mints) {
    const res = await fetch(rpcUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getTokenSupply",
        params: [mint],
      }),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Solana RPC responded ${res.status}`);

    const json = (await res.json()) as RpcSupplyResponse;
    const ui = json.result?.value?.uiAmount;
    // A per-mint RPC error (e.g. a bad address) leaves that mint unknown rather
    // than throwing away every other token's reading.
    out.set(mint, typeof ui === "number" ? ui : null);
  }

  return out;
}
