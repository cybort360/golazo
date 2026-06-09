"use client";

import { useEffect, useState } from "react";
import { getTokenPrice } from "@/lib/dexscreener";
import { parseApiError } from "@/lib/errors";
import { useTokenAddresses } from "@/hooks/useTokenAddresses";

export interface UseTokenPriceResult {
  priceUsd: string | null;
  priceSOL: string | null;
  priceChange24h: number | null; // straight from the DexScreener response
  volume24h: number | null;
  marketCap: number | null;
  imageUrl: string | null; // token logo from DexScreener, when available
  isLoading: boolean;
  error: string | null;
}

const REFETCH_MS = 30_000;

const EMPTY: Omit<UseTokenPriceResult, "isLoading"> = {
  priceUsd: null,
  priceSOL: null,
  priceChange24h: null,
  volume24h: null,
  marketCap: null,
  imageUrl: null,
  error: null,
};

export function useTokenPrice(ticker: string): UseTokenPriceResult {
  // Resolve the pump.fun mint for this ticker (merged with any admin-set
  // addresses). null until the token launches.
  const { teams } = useTokenAddresses();
  const address =
    teams.find((t) => t.ticker === ticker)?.tokenAddress ?? null;

  const [state, setState] = useState<UseTokenPriceResult>({
    ...EMPTY,
    isLoading: address !== null,
  });

  useEffect(() => {
    // No address yet: all nulls, not loading. Nothing to poll.
    if (address === null) {
      setState({ ...EMPTY, isLoading: false });
      return;
    }

    // New token selected: reset to a loading state before the first fetch.
    setState({ ...EMPTY, isLoading: true });

    let cancelled = false;

    const load = async (): Promise<void> => {
      try {
        const price = await getTokenPrice(address);
        if (cancelled) return;

        // Not (yet) on DexScreener: stop loading but keep any prior values.
        if (!price) {
          setState((prev) => ({ ...prev, isLoading: false }));
          return;
        }

        setState({
          priceUsd: price.priceUsd,
          priceSOL: price.priceNative,
          priceChange24h: price.priceChange24h,
          volume24h: price.volume24h,
          marketCap: price.marketCap,
          imageUrl: price.imageUrl ?? null,
          isLoading: false,
          error: null,
        });
      } catch (err) {
        if (cancelled) return;
        // Keep previously loaded values; surface the error.
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: parseApiError(err),
        }));
      }
    };

    void load();
    const interval = setInterval(() => void load(), REFETCH_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [address]);

  return state;
}
