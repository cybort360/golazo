"use client";

import { useCallback, useEffect, useState } from "react";
import type { FplPlayer, FplTeam, Gameweek, GameweekLineup } from "@/lib/fpl/types";

interface GwState {
  upcoming: Gameweek | null;
  active: Gameweek | null;
}
interface Mine {
  team: FplTeam | null;
  golazoBalance: number | null;
  threshold: number;
  eligible: boolean;
  gw: GwState;
}

type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Fantasy client state. Auth reuses the predict registration token (stored by
 * usePrediction under the same key), so a player signs in once on /predict and
 * is recognised here too.
 */
export function useFantasy(token: string | null) {
  const [pool, setPool] = useState<FplPlayer[]>([]);
  const [mine, setMine] = useState<Mine | null>(null);
  const [poolLoaded, setPoolLoaded] = useState(false);
  const [mineLoaded, setMineLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/fantasy/pool", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { players?: FplPlayer[] } | null) => {
        if (!cancelled) setPool(d?.players ?? []);
      })
      .catch(() => {})
      .finally(() => !cancelled && setPoolLoaded(true));
    return () => {
      cancelled = true;
    };
  }, []);

  const loadMine = useCallback(async () => {
    const headers: HeadersInit = token ? { authorization: `Bearer ${token}` } : {};
    try {
      const res = await fetch("/api/fantasy/mine", { cache: "no-store", headers });
      const d = res.ok ? ((await res.json()) as Mine) : null;
      if (d) setMine(d);
    } catch {
      /* keep last */
    } finally {
      setMineLoaded(true);
    }
  }, [token]);

  useEffect(() => {
    void loadMine();
  }, [loadMine]);

  const post = useCallback(
    async (path: string, body: unknown): Promise<ActionResult> => {
      if (!token) return { ok: false, error: "Sign in on the Predict page first" };
      try {
        const res = await fetch(path, {
          method: "POST",
          headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` },
          body: JSON.stringify(body),
        });
        const d = (await res.json()) as { ok?: boolean; error?: string };
        if (!res.ok || !d.ok) return { ok: false, error: d.error ?? "Something went wrong" };
        await loadMine();
        return { ok: true };
      } catch {
        return { ok: false, error: "Network error" };
      }
    },
    [token, loadMine],
  );

  const createTeam = useCallback(
    (name: string, squad: string[], lineup: GameweekLineup) =>
      post("/api/fantasy/team", { name, squad, lineup }),
    [post],
  );
  const setLineup = useCallback(
    (lineup: GameweekLineup) => post("/api/fantasy/lineup", { lineup }),
    [post],
  );
  const transfer = useCallback(
    (squad: string[], lineup: GameweekLineup) =>
      post("/api/fantasy/transfers", { squad, lineup }),
    [post],
  );

  return {
    pool,
    mine,
    loaded: poolLoaded && mineLoaded,
    createTeam,
    setLineup,
    transfer,
    reloadMine: loadMine,
  };
}
