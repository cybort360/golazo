"use client";

import { useCallback, useEffect, useState } from "react";
import type { WeeklyPrize, WeeklyPrizeApiResponse } from "@/lib/weeklyPrize";

export interface UseWeeklyPrizeResult {
  current: WeeklyPrize | null;
  history: WeeklyPrize[];
  isLoading: boolean;
  reload: () => void;
}

const REFETCH_MS = 60_000;

export function useWeeklyPrize(): UseWeeklyPrizeResult {
  const [current, setCurrent] = useState<WeeklyPrize | null>(null);
  const [history, setHistory] = useState<WeeklyPrize[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async (): Promise<void> => {
    try {
      const res = await fetch("/api/weekly-prize");
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const data = (await res.json()) as Partial<WeeklyPrizeApiResponse>;
      setCurrent(data.current ?? null);
      setHistory(Array.isArray(data.history) ? data.history : []);
    } catch {
      setCurrent(null);
      setHistory([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), REFETCH_MS);
    return () => clearInterval(id);
  }, [load]);

  return { current, history, isLoading, reload: () => void load() };
}
