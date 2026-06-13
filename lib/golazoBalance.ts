// Reads a wallet's $GOLAZO balance from the public Solana RPC, for the
// hold-to-enter gate. Resolves the mint the same way as /api/tokens (admin
// override over the static default). Returns null when the mint or RPC isn't
// available (e.g. pre-launch) — callers treat null as "no balance".

import { kv } from "@vercel/kv";
import { GOLAZO_TOKEN } from "@/constants/tokens";

interface TokenOverride {
  address: string;
}

async function golazoMint(): Promise<string | null> {
  try {
    const overrides =
      (await kv.get<Record<string, TokenOverride>>("token_addresses")) ?? {};
    const addr = overrides[GOLAZO_TOKEN.ticker]?.address?.trim();
    if (addr) return addr;
  } catch {
    // fall through to the static default
  }
  return GOLAZO_TOKEN.address;
}

interface TokenAccountsResponse {
  result?: {
    value?: Array<{
      account?: {
        data?: { parsed?: { info?: { tokenAmount?: { uiAmount?: number | null } } } };
      };
    }>;
  };
}

export async function golazoBalance(wallet: string): Promise<number | null> {
  const mint = await golazoMint();
  const rpc = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
  if (!mint || !rpc) return null;

  try {
    const res = await fetch(rpc, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getTokenAccountsByOwner",
        params: [wallet, { mint }, { encoding: "jsonParsed" }],
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as TokenAccountsResponse;
    const accounts = data.result?.value ?? [];
    let total = 0;
    for (const a of accounts) {
      const ui = a.account?.data?.parsed?.info?.tokenAmount?.uiAmount;
      if (typeof ui === "number") total += ui;
    }
    return total;
  } catch {
    return null;
  }
}
