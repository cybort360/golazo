"use client";

import { useEffect, useRef, useState } from "react";
import type { LiveMatch } from "@/lib/resultsSync";

interface LiveApiResponse {
  matches?: LiveMatch[];
  fetchedAt?: number;
}

const REFETCH_MS = 30_000;

/**
 * Polls /api/live and exposes the per-fixture live snapshot keyed by matchId.
 * Mirrors useMatchResults: no-store fetch, interval refresh, keep-last-good on a
 * transient error. The server side bounds provider calls, so polling here is
 * cheap regardless of how many tabs are open.
 */
export function useLiveMatches(): {
  liveByMatchId: Record<string, LiveMatch>;
} {
  const [liveByMatchId, setLiveByMatchId] = useState<
    Record<string, LiveMatch>
  >({});
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;

    const load = async () => {
      try {
        const res = await fetch("/api/live", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as LiveApiResponse;
        if (cancelledRef.current) return;
        const map: Record<string, LiveMatch> = {};
        for (const m of data.matches ?? []) map[m.matchId] = m;
        setLiveByMatchId(map);
      } catch {
        // keep last good snapshot
      }
    };

    void load();
    const id = setInterval(() => void load(), REFETCH_MS);
    return () => {
      cancelledRef.current = true;
      clearInterval(id);
    };
  }, []);

  return { liveByMatchId };
}
