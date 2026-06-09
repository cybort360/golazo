// Helius API client — ADMIN / SERVER ONLY.
// Uses HELIUS_API_KEY (no NEXT_PUBLIC_ prefix). This must never be imported
// into client components; it only runs in API routes / server actions.

const BASE_URL = `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY ?? ""}`;

export interface TokenHolder {
  address: string; // owner wallet
  uiAmount: number; // balance in UI units
}

interface RpcEnvelope<T> {
  result?: T;
}

interface HeliusTokenAccount {
  owner?: string;
  amount?: number | string;
}

interface GetTokenAccountsResult {
  token_accounts?: HeliusTokenAccount[];
}

interface TokenSupplyResult {
  value?: { decimals?: number };
}

interface GetBalanceResult {
  value?: number;
}

async function rpc<T>(method: string, params: unknown): Promise<T | null> {
  try {
    const res = await fetch(BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: "golazo", method, params }),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as RpcEnvelope<T>;
    return data.result ?? null;
  } catch {
    return null;
  }
}

async function getMintDecimals(mintAddress: string): Promise<number> {
  const result = await rpc<TokenSupplyResult>("getTokenSupply", [mintAddress]);
  return result?.value?.decimals ?? 6; // pump.fun tokens use 6 decimals
}

/**
 * All holders of a token, aggregated by owner wallet, with UI amounts.
 * Used for the champion holder snapshot. Paginates through Helius
 * getTokenAccounts (1000 per page).
 */
export async function getTokenHolders(
  mintAddress: string,
): Promise<TokenHolder[]> {
  const decimals = await getMintDecimals(mintAddress);
  const divisor = 10 ** decimals;

  const rawByOwner = new Map<string, number>();
  const limit = 1000;
  let page = 1;

  // Hard cap pages to avoid runaway loops on unexpected responses.
  for (let i = 0; i < 100; i++) {
    const result = await rpc<GetTokenAccountsResult>("getTokenAccounts", {
      mint: mintAddress,
      page,
      limit,
    });
    const accounts = result?.token_accounts;
    if (!Array.isArray(accounts) || accounts.length === 0) break;

    for (const acc of accounts) {
      const owner = acc.owner;
      if (!owner) continue;
      const raw = typeof acc.amount === "string" ? Number(acc.amount) : acc.amount;
      if (!raw || !Number.isFinite(raw)) continue;
      rawByOwner.set(owner, (rawByOwner.get(owner) ?? 0) + raw);
    }

    if (accounts.length < limit) break;
    page++;
  }

  return Array.from(rawByOwner.entries())
    .map(([address, raw]) => ({ address, uiAmount: raw / divisor }))
    .filter((h) => h.uiAmount > 0)
    .sort((a, b) => b.uiAmount - a.uiAmount);
}

/** SOL balance (not lamports) for a wallet. Returns 0 on failure. */
export async function getWalletSOLBalance(
  walletAddress: string,
): Promise<number> {
  const result = await rpc<GetBalanceResult>("getBalance", [walletAddress]);
  const lamports = result?.value;
  return typeof lamports === "number" ? lamports / 1e9 : 0;
}
