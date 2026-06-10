"use client";

import { useEffect, useState } from "react";
import type { BuybackEntry } from "@/lib/buyback";

export interface UseBuybackHistoryResult {
  entries: BuybackEntry[];
  isLoading: boolean;
}

const REFETCH_MS = 60_000;

export function useBuybackHistory(): UseBuybackHistoryResult {
  const [entries, setEntries] = useState<BuybackEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async (): Promise<void> => {
      try {
        const res = await fetch("/api/buyback-history");
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        const data = (await res.json()) as { entries?: BuybackEntry[] };
        if (cancelled) return;
        setEntries(Array.isArray(data.entries) ? data.entries : []);
      } catch {
        if (cancelled) return;
        setEntries([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void load();
    const id = setInterval(() => void load(), REFETCH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return { entries, isLoading };
}
