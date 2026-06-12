"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { BuybackEntry } from "@/lib/buyback";

export interface UseBuybackHistoryResult {
  entries: BuybackEntry[];
  isLoading: boolean;
  reload: () => void;
}

const REFETCH_MS = 60_000;

export function useBuybackHistory(): UseBuybackHistoryResult {
  const [entries, setEntries] = useState<BuybackEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const cancelledRef = useRef(false);

  const load = useCallback(async (): Promise<void> => {
    try {
      const res = await fetch("/api/buyback-history", { cache: "no-store" });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const data = (await res.json()) as { entries?: BuybackEntry[] };
      if (cancelledRef.current) return;
      setEntries(Array.isArray(data.entries) ? data.entries : []);
    } catch {
      if (cancelledRef.current) return;
      setEntries([]);
    } finally {
      if (!cancelledRef.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    cancelledRef.current = false;
    void load();
    const id = setInterval(() => void load(), REFETCH_MS);
    return () => {
      cancelledRef.current = true;
      clearInterval(id);
    };
  }, [load]);

  return { entries, isLoading, reload: load };
}
