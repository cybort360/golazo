"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getKickoffMs } from "@/lib/schedule";
import { formatCountdownPrecise } from "@/lib/time";
import { buildSlate } from "@/lib/predictSlate";
import { useLiveMatches } from "@/hooks/useLiveMatches";
import { usePredictionLeaderboard } from "@/hooks/usePredictionLeaderboard";
import { Flag } from "@/components/Flag";
import { LocalTime } from "@/components/LocalTime";

// Minimal typing for the bits of the Telegram WebApp SDK we touch.
interface TgWebApp {
  initData: string;
  ready: () => void;
  expand: () => void;
  initDataUnsafe?: { user?: { username?: string; first_name?: string } };
}
function tg(): TgWebApp | null {
  if (typeof window === "undefined") return null;
  return (
    (window as unknown as { Telegram?: { WebApp?: TgWebApp } }).Telegram
      ?.WebApp ?? null
  );
}

function LockCountdown({ kickoffMs }: { kickoffMs: number }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const t = () => setNow(Date.now());
    t();
    const id = setInterval(t, 1000);
    return () => clearInterval(id);
  }, []);
  if (now === null) return null;
  const diff = kickoffMs - now;
  return (
    <span suppressHydrationWarning className="tabular-nums text-slate-400">
      {diff <= 0 ? "Locked" : `Locks in ${formatCountdownPrecise(diff)}`}
    </span>
  );
}

export default function TelegramMiniApp() {
  const [initData, setInitData] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "register" | "ready">("loading");
  const [nickname, setNickname] = useState("");
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState<number | null>(null);
  const [tab, setTab] = useState<"week" | "season">("week");

  const { liveByMatchId } = useLiveMatches();
  const { data: leaderboard } = usePredictionLeaderboard();

  // Init the Telegram SDK and capture initData. The SDK script loads
  // asynchronously, so poll briefly for it before giving up.
  useEffect(() => {
    let tries = 0;
    const check = () => {
      const w = tg();
      if (w && w.initData) {
        w.ready();
        w.expand();
        setInitData(w.initData);
        clearInterval(timer);
      } else if (++tries > 20) {
        setInitData(""); // ~2s with no SDK → opened outside Telegram
        clearInterval(timer);
      }
    };
    const timer = setInterval(check, 100);
    check();
    return () => clearInterval(timer);
  }, []);

  // Mounted clock for the slate / countdowns.
  useEffect(() => {
    const t = () => setNow(Date.now());
    t();
    const id = setInterval(t, 30_000);
    return () => clearInterval(id);
  }, []);

  const headers = useCallback(
    (): HeadersInit => ({
      "Content-Type": "application/json",
      "X-Telegram-Init-Data": initData ?? "",
    }),
    [initData],
  );

  // Load registration + picks once we have initData.
  useEffect(() => {
    if (initData === null || initData === "") return;
    let cancelled = false;
    fetch("/api/predict/mine", {
      cache: "no-store",
      headers: { "X-Telegram-Init-Data": initData },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { player?: { nickname?: string } | null; picks?: Record<string, string> } | null) => {
        if (cancelled) return;
        if (d?.player) {
          setPicks(d.picks ?? {});
          setStatus("ready");
        } else {
          setStatus("register");
        }
      })
      .catch(() => !cancelled && setStatus("register"));
    return () => {
      cancelled = true;
    };
  }, [initData]);

  const register = async () => {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/predict/register", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ nickname }),
      });
      const d = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !d.ok) setError(d.error ?? "Registration failed");
      else setStatus("ready");
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  };

  const pick = async (matchId: string, value: string) => {
    setPicks((p) => ({ ...p, [matchId]: value })); // optimistic
    try {
      const res = await fetch("/api/predict/submit", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ matchId, pick: value }),
      });
      if (!res.ok) {
        const d = (await res.json()) as { error?: string };
        setError(d.error ?? "Could not save pick");
      }
    } catch {
      setError("Network error");
    }
  };

  const slate = useMemo(() => buildSlate(now, liveByMatchId), [now, liveByMatchId]);
  const rows = tab === "week" ? leaderboard?.week ?? [] : leaderboard?.season ?? [];

  // Opened outside Telegram (no initData) → guard.
  if (initData === "") {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-xl font-bold text-slate-900">Open in Telegram</h1>
        <p className="mt-2 text-sm text-slate-500">
          This is the Golazo prediction Mini App. Open it from the Golazo
          Telegram channel or bot to play.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-5 px-4 py-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          Predict &amp; Win
        </h1>
        <p className="text-xs text-slate-500">
          1 point per correct call. Top the weekly board to win SOL. Picks lock
          at kickoff.
        </p>
      </header>

      {status === "loading" && (
        <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
      )}

      {status === "register" && (
        <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
          <h2 className="text-base font-semibold text-slate-900">Pick a nickname</h2>
          <p className="text-sm text-slate-500">
            You&apos;re signed in with Telegram. Choose a nickname to play — it
            can&apos;t be changed later.
          </p>
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Nickname (3–20 chars)"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-green-500/40 focus:ring-2"
          />
          {error && <p className="text-sm font-medium text-red-600">{error}</p>}
          <button
            type="button"
            onClick={register}
            disabled={busy}
            className="w-fit rounded-full bg-green-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? "Registering…" : "Start playing"}
          </button>
        </section>
      )}

      {status === "ready" && (
        <section className="flex flex-col gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Upcoming matches
          </h2>
          {slate.length === 0 ? (
            <p className="text-sm text-slate-400">
              No open matches right now. Check back before the next kickoff.
            </p>
          ) : (
            slate.map((entry) => (
              <div
                key={entry.match.id}
                className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-card"
              >
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>
                    {entry.match.groupOrRound} ·{" "}
                    <LocalTime date={entry.match.date} time={entry.match.time} />
                  </span>
                  <LockCountdown kickoffMs={getKickoffMs(entry.match)} />
                </div>
                <div className="flex gap-2">
                  {entry.options.map((o) => {
                    const active = picks[entry.match.id] === o.value;
                    return (
                      <button
                        key={o.value}
                        type="button"
                        onClick={() => pick(entry.match.id, o.value)}
                        className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-sm font-semibold ${
                          active
                            ? "border-green-600 bg-green-50 text-green-700"
                            : "border-slate-200 text-slate-700"
                        }`}
                      >
                        {o.flagCode !== null && (
                          <Flag code={o.flagCode} className="text-sm" />
                        )}
                        {o.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </section>
      )}

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Leaderboard
          </h2>
          <div className="flex gap-0.5 rounded-full bg-slate-100 p-1 text-xs font-semibold">
            {(["week", "season"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`rounded-full px-3 py-1 ${
                  tab === t ? "bg-white text-green-600 shadow-sm" : "text-slate-500"
                }`}
              >
                {t === "week" ? "Week" : "Season"}
              </button>
            ))}
          </div>
        </div>
        {rows.length === 0 ? (
          <p className="text-sm text-slate-400">No scores yet — get predicting.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            {rows.slice(0, 20).map((r, i) => (
              <div
                key={`${r.nickname}-${i}`}
                className="flex items-center justify-between border-b border-slate-100 px-3 py-2 text-sm last:border-b-0"
              >
                <span className="flex items-center gap-2">
                  <span className="w-5 tabular-nums text-slate-400">{i + 1}</span>
                  <span className="font-semibold text-slate-900">{r.nickname}</span>
                </span>
                <span className="flex items-center gap-3 tabular-nums">
                  <span className="text-slate-400">{r.correct}/{r.played}</span>
                  <span className="font-bold text-green-600">{r.points}</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {error && status === "ready" && (
        <div className="fixed bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-slate-900 px-4 py-2 text-sm text-white shadow-lg">
          {error}
        </div>
      )}
    </div>
  );
}
