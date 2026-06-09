"use client";

import { useEffect, useState } from "react";
import { getSOLPriceUSD } from "@/lib/dexscreener";

export interface UsePrizePoolResult {
  balanceSOL: number | null;
  balanceUSD: number | null;
  futureFundSOL: number | null;
  isLoading: boolean;
  updatedAt: number | null; // ms timestamp of the last successful on-chain read
}

const REFETCH_MS = 60_000;
const LAMPORTS_PER_SOL = 1e9;

interface GetBalanceResponse {
  result?: { value?: number };
}

/**
 * Read a wallet's SOL balance via the public Solana JSON-RPC. No API key.
 * Returns null on any failure (missing address/RPC, network error, bad shape).
 */
async function fetchSOLBalance(address: string): Promise<number | null> {
  const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
  if (!rpcUrl || !address) return null;

  try {
    const res = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getBalance",
        params: [address],
      }),
    });
    if (!res.ok) return null;

    const data = (await res.json()) as GetBalanceResponse;
    const lamports = data.result?.value;
    // Note: guard the type explicitly, because `value / 1e9 ?? null` would yield NaN
    // (not null) when value is undefined, since ?? only catches null/undefined.
    return typeof lamports === "number" ? lamports / LAMPORTS_PER_SOL : null;
  } catch {
    return null;
  }
}

export function usePrizePool(): UsePrizePoolResult {
  const [state, setState] = useState<UsePrizePoolResult>({
    balanceSOL: null,
    balanceUSD: null,
    futureFundSOL: null,
    isLoading: true,
    updatedAt: null,
  });

  useEffect(() => {
    const prizeWallet = process.env.NEXT_PUBLIC_PRIZE_POOL_WALLET ?? "";
    const futureWallet = process.env.NEXT_PUBLIC_FUTURE_FUND_WALLET ?? "";

    let cancelled = false;

    const load = async (): Promise<void> => {
      try {
        const [balanceSOL, futureFundSOL, solPriceUSD] = await Promise.all([
          fetchSOLBalance(prizeWallet),
          fetchSOLBalance(futureWallet),
          getSOLPriceUSD(),
        ]);
        if (cancelled) return;

        const balanceUSD =
          balanceSOL !== null && solPriceUSD !== null
            ? balanceSOL * solPriceUSD
            : null;

        setState({
          balanceSOL,
          balanceUSD,
          futureFundSOL,
          isLoading: false,
          updatedAt: Date.now(),
        });
      } catch {
        if (cancelled) return;
        setState({
          balanceSOL: null,
          balanceUSD: null,
          futureFundSOL: null,
          isLoading: false,
          updatedAt: null,
        });
      }
    };

    void load();
    const interval = setInterval(() => void load(), REFETCH_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return state;
}
