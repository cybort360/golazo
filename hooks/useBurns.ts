"use client";

import { useEffect, useRef, useState } from "react";
import type { BurnStat } from "@/lib/burns";

interface BurnsApiResponse {
  burns?: BurnStat[];
  fetchedAt?: number;
}

const REFETCH_MS = 60_000;

/**
 * Polls /api/burns and exposes per-token burn stats keyed by ticker, plus the
 * list sorted most-burned-first. Mirrors useLiveMatches: no-store fetch,
 * interval refresh, keep-last-good on a transient error.
 */
export function useBurns(): {
  burns: BurnStat[];
  byTicker: Record<string, BurnStat>;
} {
  const [burns, setBurns] = useState<BurnStat[]>([]);
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;

    const load = async () => {
      try {
        const res = await fetch("/api/burns", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as BurnsApiResponse;
        if (cancelledRef.current) return;
        setBurns(Array.isArray(data.burns) ? data.burns : []);
      } catch {
        // keep last good
      }
    };

    void load();
    const id = setInterval(() => void load(), REFETCH_MS);
    return () => {
      cancelledRef.current = true;
      clearInterval(id);
    };
  }, []);

  const byTicker: Record<string, BurnStat> = {};
  for (const b of burns) byTicker[b.ticker] = b;

  return { burns, byTicker };
}
