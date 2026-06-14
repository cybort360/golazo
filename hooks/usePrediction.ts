"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "golazo_predict";

export interface Registration {
  nickname: string;
  wallet: string;
  token: string;
}

export interface Eligibility {
  golazoBalance: number | null;
  threshold: number;
  eligible: boolean;
}

interface Stored {
  reg: Registration | null;
  picks: Record<string, string>;
  locked?: string[];
}

type ActionResult = { ok: true } | { ok: false; error: string };

function read(): Stored {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Stored;
  } catch {
    /* ignore */
  }
  return { reg: null, picks: {} };
}

function write(stored: Stored): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch {
    /* ignore */
  }
}

/**
 * Local-first prediction identity: registration (nickname + wallet + token) and
 * the player's picks live in localStorage, with the token authorizing writes to
 * the server. Picks are re-hydrated from the server on load so they survive a
 * cache clear (as long as the token is kept).
 */
export function usePrediction() {
  const [reg, setReg] = useState<Registration | null>(null);
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [locked, setLocked] = useState<string[]>([]);
  const [eligibility, setEligibility] = useState<Eligibility | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const stored = read();
    setReg(stored.reg);
    setPicks(stored.picks);
    setLocked(stored.locked ?? []);
    setLoaded(true);
  }, []);

  // Persist registration + picks + locks once loaded (single source of truth).
  useEffect(() => {
    if (loaded) write({ reg, picks, locked });
  }, [reg, picks, locked, loaded]);

  // Authoritative state from the server (in case localStorage was cleared).
  useEffect(() => {
    if (!reg?.token) return;
    let cancelled = false;
    fetch("/api/predict/mine", {
      cache: "no-store",
      headers: { authorization: `Bearer ${reg.token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then(
        (d: {
          player?: unknown;
          picks?: Record<string, string>;
          locked?: string[];
          golazoBalance?: number | null;
          threshold?: number;
          eligible?: boolean;
        } | null) => {
          // Only adopt the server's state when it recognized the player; an
          // error / unknown-token response shouldn't blank local picks.
          if (cancelled || !d?.player || !d.picks) return;
          setPicks(d.picks);
          setLocked(d.locked ?? []);
          setEligibility({
            golazoBalance: d.golazoBalance ?? null,
            threshold: d.threshold ?? 0,
            eligible: d.eligible ?? true,
          });
        },
      )
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [reg]);

  const register = useCallback(
    async (payload: {
      nickname: string;
      wallet: string;
      signature: string;
      ts: number;
    }): Promise<ActionResult> => {
      try {
        const res = await fetch("/api/predict/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = (await res.json()) as {
          ok?: boolean;
          error?: string;
          nickname?: string;
          wallet?: string;
          token?: string;
        };
        if (!res.ok || !data.ok || !data.token) {
          return { ok: false, error: data.error ?? "Registration failed" };
        }
        setReg({
          nickname: data.nickname!,
          wallet: data.wallet!,
          token: data.token,
        });
        return { ok: true };
      } catch {
        return { ok: false, error: "Network error" };
      }
    },
    [],
  );

  const login = useCallback(
    async (payload: {
      wallet: string;
      signature: string;
      ts: number;
    }): Promise<ActionResult> => {
      try {
        const res = await fetch("/api/predict/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = (await res.json()) as {
          ok?: boolean;
          error?: string;
          nickname?: string;
          wallet?: string;
          token?: string;
        };
        if (!res.ok || !data.ok || !data.token) {
          return { ok: false, error: data.error ?? "Sign-in failed" };
        }
        setReg({
          nickname: data.nickname!,
          wallet: data.wallet!,
          token: data.token,
        });
        return { ok: true };
      } catch {
        return { ok: false, error: "Network error" };
      }
    },
    [],
  );

  const submitPick = useCallback(
    async (matchId: string, pick: string): Promise<ActionResult> => {
      if (!reg?.token) return { ok: false, error: "Not registered" };
      if (locked.includes(matchId)) return { ok: false, error: "This pick is locked" };
      try {
        const res = await fetch("/api/predict/submit", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            authorization: `Bearer ${reg.token}`,
          },
          body: JSON.stringify({ matchId, pick }),
        });
        const data = (await res.json()) as { ok?: boolean; error?: string };
        if (!res.ok || !data.ok) {
          return { ok: false, error: data.error ?? "Could not save pick" };
        }
        setPicks((prev) => ({ ...prev, [matchId]: pick }));
        return { ok: true };
      } catch {
        return { ok: false, error: "Network error" };
      }
    },
    [reg, locked],
  );

  const lockPick = useCallback(
    async (matchId: string): Promise<ActionResult> => {
      if (!reg?.token) return { ok: false, error: "Not registered" };
      try {
        const res = await fetch("/api/predict/lock", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            authorization: `Bearer ${reg.token}`,
          },
          body: JSON.stringify({ matchId }),
        });
        const data = (await res.json()) as { ok?: boolean; error?: string };
        if (!res.ok || !data.ok) {
          return { ok: false, error: data.error ?? "Could not lock pick" };
        }
        setLocked((prev) => (prev.includes(matchId) ? prev : [...prev, matchId]));
        return { ok: true };
      } catch {
        return { ok: false, error: "Network error" };
      }
    },
    [reg],
  );

  return { reg, picks, locked, eligibility, loaded, register, login, submitPick, lockPick };
}
