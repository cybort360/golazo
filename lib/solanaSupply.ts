// Reads SPL token supplies from the public Solana RPC in a single batched
// JSON-RPC request, so one HTTP round-trip covers every launched token. Returns
// the ui (decimal-adjusted) supply per mint; a per-mint failure resolves to
// null rather than failing the whole batch. Throws only on a transport-level
// failure so the caller can fall back to its last cached snapshot.

// Conservative batch size for the public endpoint.
const BATCH_SIZE = 50;

interface RpcSupplyResponse {
  id: number;
  result?: { value?: { uiAmount?: number | null } };
  error?: unknown;
}

export async function fetchTokenSupplies(
  mints: string[],
  rpcUrl: string,
): Promise<Map<string, number | null>> {
  const out = new Map<string, number | null>();
  if (mints.length === 0) return out;

  for (let start = 0; start < mints.length; start += BATCH_SIZE) {
    const chunk = mints.slice(start, start + BATCH_SIZE);
    // Global ids let us map each response back to its mint regardless of the
    // order the RPC returns them in.
    const body = chunk.map((mint, i) => ({
      jsonrpc: "2.0",
      id: start + i,
      method: "getTokenSupply",
      params: [mint],
    }));

    const res = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Solana RPC responded ${res.status}`);

    const json = (await res.json()) as unknown;
    if (!Array.isArray(json)) throw new Error("Unexpected RPC batch response");

    for (const entry of json as RpcSupplyResponse[]) {
      const mint = mints[entry.id];
      if (mint === undefined) continue;
      const ui = entry.result?.value?.uiAmount;
      out.set(mint, typeof ui === "number" ? ui : null);
    }
    // Any mint with no matching response entry is treated as unknown.
    for (const mint of chunk) if (!out.has(mint)) out.set(mint, null);
  }

  return out;
}
