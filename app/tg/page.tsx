"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getKickoffMs } from "@/lib/schedule";
import { formatCountdownPrecise } from "@/lib/time";
import { buildSlate } from "@/lib/predictSlate";
import { useLiveMatches } from "@/hooks/useLiveMatches";
import { usePredictionLeaderboard } from "@/hooks/usePredictionLeaderboard";
import { useTokenAddresses } from "@/hooks/useTokenAddresses";
import { Flag } from "@/components/Flag";
import { LocalTime } from "@/components/LocalTime";
import ConfirmDialog from "@/components/ConfirmDialog";

// Minimal typing for the bits of the Telegram WebApp SDK we touch.
interface TgWebApp {
  initData: string;
  ready: () => void;
  expand: () => void;
  openLink?: (url: string) => void;
  initDataUnsafe?: { user?: { username?: string; first_name?: string } };
}

interface Eligibility {
  wallet: string | null;
  golazoBalance: number | null;
  threshold: number;
  eligible: boolean;
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
  const [locked, setLocked] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState<number | null>(null);
  const [tab, setTab] = useState<"week" | "season">("week");
  const [confirmLock, setConfirmLock] = useState<string | null>(null);
  const [elig, setElig] = useState<Eligibility | null>(null);
  const [linking, setLinking] = useState(false);

  const { liveByMatchId } = useLiveMatches();
  const { data: leaderboard } = usePredictionLeaderboard();
  const { golazo } = useTokenAddresses();

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

  // Load registration + picks + pot eligibility for the Telegram player.
  const loadMine = useCallback(async () => {
    if (!initData) return;
    try {
      const res = await fetch("/api/predict/mine", {
        cache: "no-store",
        headers: { "X-Telegram-Init-Data": initData },
      });
      const d = res.ok
        ? ((await res.json()) as {
            player?: { nickname?: string; wallet?: string | null } | null;
            picks?: Record<string, string>;
            locked?: string[];
            golazoBalance?: number | null;
            threshold?: number;
            eligible?: boolean;
          } | null)
        : null;
      if (d?.player) {
        setPicks(d.picks ?? {});
        setLocked(d.locked ?? []);
        setElig({
          wallet: d.player.wallet ?? null,
          golazoBalance: d.golazoBalance ?? null,
          threshold: d.threshold ?? 0,
          eligible: d.eligible ?? true,
        });
        setStatus("ready");
      } else {
        // Don't downgrade a ready player on a transient empty response.
        setStatus((s) => (s === "ready" ? s : "register"));
      }
    } catch {
      /* keep current status on a network blip */
    }
  }, [initData]);

  useEffect(() => {
    if (initData === null || initData === "") return;
    void loadMine();
  }, [initData, loadMine]);

  // Re-check when the user returns to the Mini App — e.g. after linking a wallet
  // in the browser — so eligibility flips without a manual reload.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") void loadMine();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [loadMine]);

  // Start the wallet-link hand-off: mint a token, then open the web link flow.
  const startLink = async () => {
    setLinking(true);
    setError(null);
    try {
      const res = await fetch("/api/predict/link/start", {
        method: "POST",
        headers: headers(),
      });
      const d = (await res.json()) as { ok?: boolean; token?: string; error?: string };
      if (!res.ok || !d.ok || !d.token) {
        setError(d.error ?? "Could not start linking");
        return;
      }
      const url = `${window.location.origin}/predict?link=${encodeURIComponent(d.token)}`;
      const w = tg();
      if (w?.openLink) w.openLink(url);
      else window.open(url, "_blank");
    } catch {
      setError("Network error");
    } finally {
      setLinking(false);
    }
  };

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
    if (locked.includes(matchId)) return;
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

  const doLock = async () => {
    if (!confirmLock) return;
    const matchId = confirmLock;
    setConfirmLock(null);
    try {
      const res = await fetch("/api/predict/lock", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ matchId }),
      });
      if (res.ok) {
        setLocked((prev) => (prev.includes(matchId) ? prev : [...prev, matchId]));
      } else {
        const d = (await res.json()) as { error?: string };
        setError(d.error ?? "Could not lock pick");
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

      {status === "ready" && elig && elig.threshold > 0 && (
        !elig.wallet ? (
          <section className="flex flex-col gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-medium text-amber-800">
              Link a Solana wallet to qualify for the weekly SOL pot — it&apos;s
              how the {elig.threshold.toLocaleString()} $GOLAZO hold is checked and
              where prizes pay out. Your picks already count.
            </p>
            <button
              type="button"
              onClick={startLink}
              disabled={linking}
              className="w-fit rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {linking ? "Opening…" : "Link wallet"}
            </button>
          </section>
        ) : elig.eligible ? (
          <p className="inline-flex w-fit items-center gap-1.5 rounded-full bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700">
            ✓ You&apos;re in for the weekly pot — holding enough $GOLAZO.
          </p>
        ) : (
          <p className="flex flex-wrap items-center gap-1.5 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Hold {elig.threshold.toLocaleString()} $GOLAZO to qualify — you have{" "}
            {(elig.golazoBalance ?? 0).toLocaleString()}.
            {golazo.meteoraUrl && (
              <a
                href={golazo.meteoraUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-green-700 underline underline-offset-2"
              >
                Get $GOLAZO
              </a>
            )}
          </p>
        )
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
            slate.map((entry) => {
              const isLocked = locked.includes(entry.match.id);
              return (
                <div
                  key={entry.match.id}
                  className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-card"
                >
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>
                      {entry.match.groupOrRound} ·{" "}
                      <LocalTime date={entry.match.date} time={entry.match.time} />
                    </span>
                    {isLocked ? (
                      <span className="font-semibold text-green-600">🔒 Locked</span>
                    ) : (
                      <LockCountdown kickoffMs={getKickoffMs(entry.match)} />
                    )}
                  </div>
                  <div className="flex gap-2">
                    {entry.options.map((o) => {
                      const active = picks[entry.match.id] === o.value;
                      return (
                        <button
                          key={o.value}
                          type="button"
                          disabled={isLocked}
                          onClick={() => pick(entry.match.id, o.value)}
                          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-sm font-semibold ${
                            active
                              ? "border-green-600 bg-green-50 text-green-700"
                              : "border-slate-200 text-slate-700"
                          } ${isLocked && !active ? "opacity-40" : ""}`}
                        >
                          {o.flagCode !== null && (
                            <Flag code={o.flagCode} className="text-sm" />
                          )}
                          {o.label}
                        </button>
                      );
                    })}
                  </div>
                  {picks[entry.match.id] && !isLocked && (
                    <button
                      type="button"
                      onClick={() => setConfirmLock(entry.match.id)}
                      className="self-end text-xs font-semibold text-slate-500 underline underline-offset-2"
                    >
                      Lock this pick
                    </button>
                  )}
                </div>
              );
            })
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

      <ConfirmDialog
        open={confirmLock !== null}
        title="Lock this pick?"
        body="Once locked, you can't change this pick — even before kickoff."
        confirmLabel="Lock it"
        onConfirm={doLock}
        onCancel={() => setConfirmLock(null)}
      />
    </div>
  );
}
