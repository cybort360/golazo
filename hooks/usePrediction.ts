"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "golazo_predict";

export interface Registration {
  nickname: string;
  wallet: string;
  token: string;
}

interface Stored {
  reg: Registration | null;
  picks: Record<string, string>;
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
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const stored = read();
    setReg(stored.reg);
    setPicks(stored.picks);
    setLoaded(true);
  }, []);

  // Authoritative picks from the server (in case localStorage was cleared).
  useEffect(() => {
    if (!reg?.token) return;
    let cancelled = false;
    fetch(`/api/predict/mine?token=${encodeURIComponent(reg.token)}`, {
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { picks?: Record<string, string> } | null) => {
        if (cancelled || !d?.picks) return;
        setPicks(d.picks);
        write({ reg, picks: d.picks });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [reg]);

  const register = useCallback(
    async (nickname: string, wallet: string): Promise<ActionResult> => {
      try {
        const res = await fetch("/api/predict/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nickname, wallet }),
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
        const next: Registration = {
          nickname: data.nickname!,
          wallet: data.wallet!,
          token: data.token,
        };
        setReg(next);
        write({ reg: next, picks });
        return { ok: true };
      } catch {
        return { ok: false, error: "Network error" };
      }
    },
    [picks],
  );

  const submitPick = useCallback(
    async (matchId: string, pick: string): Promise<ActionResult> => {
      if (!reg?.token) return { ok: false, error: "Not registered" };
      try {
        const res = await fetch("/api/predict/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: reg.token, matchId, pick }),
        });
        const data = (await res.json()) as { ok?: boolean; error?: string };
        if (!res.ok || !data.ok) {
          return { ok: false, error: data.error ?? "Could not save pick" };
        }
        const nextPicks = { ...picks, [matchId]: pick };
        setPicks(nextPicks);
        write({ reg, picks: nextPicks });
        return { ok: true };
      } catch {
        return { ok: false, error: "Network error" };
      }
    },
    [reg, picks],
  );

  return { reg, picks, loaded, register, submitPick };
}
