"use client";

import { useEffect, useState } from "react";

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
}

interface ResultsApiResponse {
  results?: MatchResult[];
  champion?: string | null;
}

const REFETCH_MS = 60_000;

export function useMatchResults(): UseMatchResultsResult {
  const [state, setState] = useState<UseMatchResultsResult>({
    results: [],
    isLoading: true,
    champion: null,
  });

  useEffect(() => {
    let cancelled = false;

    const load = async (): Promise<void> => {
      try {
        const res = await fetch("/api/results");
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);

        const data = (await res.json()) as ResultsApiResponse;
        if (cancelled) return;

        setState({
          results: Array.isArray(data.results) ? data.results : [],
          champion: typeof data.champion === "string" ? data.champion : null,
          isLoading: false,
        });
      } catch {
        if (cancelled) return;
        setState({ results: [], isLoading: false, champion: null });
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
