"use client";

import { useEffect, useState } from "react";
import { TEAMS, type Team } from "@/constants/teams";
import { GOLAZO_TOKEN, type TokenInfo } from "@/constants/tokens";

export interface UseTokenAddressesResult {
  teams: Team[];
  golazo: TokenInfo;
  isLoading: boolean;
}

interface Snapshot {
  teams: Team[];
  golazo: TokenInfo;
}

// Static fallback used before the fetch resolves and if it fails.
const FALLBACK: Snapshot = { teams: TEAMS, golazo: GOLAZO_TOKEN };

// Module-level shared cache so /api/tokens is fetched exactly once across the
// whole app, no matter how many components call the hook. Subscribers are
// notified when the data arrives.
let cache: Snapshot | null = null;
let inFlight: Promise<Snapshot> | null = null;
const subscribers = new Set<() => void>();

function loadOnce(): Promise<Snapshot> {
  if (inFlight) return inFlight;
  inFlight = fetch("/api/tokens", { cache: "no-store" })
    .then((res) => (res.ok ? res.json() : Promise.reject(new Error("bad status"))))
    .then((data: Partial<Snapshot>) => {
      cache = {
        teams: Array.isArray(data.teams) ? data.teams : TEAMS,
        golazo: data.golazo ?? GOLAZO_TOKEN,
      };
      return cache;
    })
    .catch(() => {
      // Fetch failed, so degrade to the static defaults (still mark resolved).
      cache = FALLBACK;
      return cache;
    })
    .finally(() => {
      subscribers.forEach((fn) => fn());
    });
  return inFlight;
}

export function useTokenAddresses(): UseTokenAddressesResult {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(cache);

  useEffect(() => {
    if (cache) {
      setSnapshot(cache);
      return;
    }
    const update = () => setSnapshot(cache);
    subscribers.add(update);
    void loadOnce();
    return () => {
      subscribers.delete(update);
    };
  }, []);

  return {
    teams: snapshot?.teams ?? TEAMS,
    golazo: snapshot?.golazo ?? GOLAZO_TOKEN,
    isLoading: snapshot === null,
  };
}
