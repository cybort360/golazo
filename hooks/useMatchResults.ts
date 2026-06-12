"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface MatchResult {
  matchId: string;
  winner: string; // ticker
  loser: string; // ticker
  isDraw: boolean;
  timestamp: number;
  buybackTxUrl: string | null;
}

export interface UseMatchResultsResult {
  results: MatchResult[];
  isLoading: boolean;
  champion: string | null;
  reload: () => void;
}

interface ResultsApiResponse {
  results?: MatchResult[];
  champion?: string | null;
}

const REFETCH_MS = 60_000;

export function useMatchResults(): UseMatchResultsResult {
  const [state, setState] = useState<Omit<UseMatchResultsResult, "reload">>({
    results: [],
    isLoading: true,
    champion: null,
  });
  const cancelledRef = useRef(false);

  const load = useCallback(async (): Promise<void> => {
    try {
      const res = await fetch("/api/results");
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);

      const data = (await res.json()) as ResultsApiResponse;
      if (cancelledRef.current) return;

      setState({
        results: Array.isArray(data.results) ? data.results : [],
        champion: typeof data.champion === "string" ? data.champion : null,
        isLoading: false,
      });
    } catch {
      if (cancelledRef.current) return;
      // Keep the last good data on a transient error; just stop the spinner.
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  useEffect(() => {
    cancelledRef.current = false;
    void load();
    const interval = setInterval(() => void load(), REFETCH_MS);

    return () => {
      cancelledRef.current = true;
      clearInterval(interval);
    };
  }, [load]);

  return { ...state, reload: load };
}
