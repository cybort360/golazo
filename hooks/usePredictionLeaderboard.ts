"use client";

import { useEffect, useRef, useState } from "react";

export interface LeaderboardRow {
  nickname: string;
  wallet: string; // truncated for display
  points: number;
  correct: number;
  played: number;
}

export interface Matchweek {
  id: string;
  label: string;
  rows: LeaderboardRow[];
}

export interface LeaderboardData {
  currentWeek: string;
  minGolazo?: number;
  season: LeaderboardRow[];
  week: LeaderboardRow[];
  matchweeks?: Matchweek[];
}

const REFETCH_MS = 60_000;

export function usePredictionLeaderboard(): {
  data: LeaderboardData | null;
  isLoading: boolean;
} {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    const load = async () => {
      try {
        const res = await fetch("/api/predict/leaderboard", { cache: "no-store" });
        if (!res.ok) return;
        const d = (await res.json()) as LeaderboardData;
        if (cancelledRef.current) return;
        setData(d);
      } catch {
        /* keep last good */
      } finally {
        if (!cancelledRef.current) setIsLoading(false);
      }
    };
    void load();
    const id = setInterval(() => void load(), REFETCH_MS);
    return () => {
      cancelledRef.current = true;
      clearInterval(id);
    };
  }, []);

  return { data, isLoading };
}
