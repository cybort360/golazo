"use client";

import { useEffect, useMemo, useState } from "react";
import { getKickoffMs } from "@/lib/schedule";
import { formatCountdownPrecise } from "@/lib/time";
import { buildSlate, type SlateEntry } from "@/lib/predictSlate";
import { usePrediction } from "@/hooks/usePrediction";
import {
  usePredictionLeaderboard,
  type LeaderboardRow,
} from "@/hooks/usePredictionLeaderboard";
import { useLiveMatches } from "@/hooks/useLiveMatches";
import { useTokenAddresses } from "@/hooks/useTokenAddresses";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { registerMessage, loginMessage, linkMessage } from "@/lib/predictAuth";
import { Flag } from "@/components/Flag";
import { Icon } from "@/components/Icon";
import { LocalTime } from "@/components/LocalTime";
import ShareButtons from "@/components/ShareButtons";
import ConfirmDialog from "@/components/ConfirmDialog";

/** base64-encode a signature byte array in the browser (no Buffer). */
function toBase64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

// ── Registration ──────────────────────────────────────────────────────────────

type AuthResult = { ok: boolean; error?: string };

function RegistrationForm({
  onRegister,
  onLogin,
}: {
  onRegister: (payload: {
    nickname: string;
    wallet: string;
    signature: string;
    ts: number;
  }) => Promise<AuthResult>;
  onLogin: (payload: {
    wallet: string;
    signature: string;
    ts: number;
  }) => Promise<AuthResult>;
}) {
  const { publicKey, signMessage, connected, disconnect } = useWallet();
  const { setVisible } = useWalletModal();
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // null = haven't checked this wallet yet; drives register-vs-sign-in.
  const [known, setKnown] = useState<{ nickname: string } | null>(null);
  const [checking, setChecking] = useState(false);

  const wallet = connected && publicKey ? publicKey.toBase58() : null;

  // When a wallet connects, ask the server whether it's already registered so
  // we can offer a one-tap sign-in instead of a dead-end re-register.
  useEffect(() => {
    if (!wallet) {
      setKnown(null);
      return;
    }
    let cancelled = false;
    setChecking(true);
    setError(null);
    fetch(`/api/predict/lookup?wallet=${encodeURIComponent(wallet)}`, {
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { registered?: boolean; nickname?: string } | null) => {
        if (cancelled) return;
        setKnown(d?.registered && d.nickname ? { nickname: d.nickname } : null);
      })
      .catch(() => {
        if (!cancelled) setKnown(null);
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [wallet]);

  const sign = async (message: string): Promise<string> => {
    if (!signMessage) throw new Error("no-signer");
    return toBase64(await signMessage(new TextEncoder().encode(message)));
  };

  const doRegister = async () => {
    setError(null);
    if (!wallet || !signMessage) {
      setError("Connect a wallet that can sign messages (e.g. Phantom).");
      return;
    }
    setBusy(true);
    try {
      const ts = Date.now();
      const signature = await sign(registerMessage(wallet, ts));
      const res = await onRegister({ nickname, wallet, signature, ts });
      if (!res.ok) setError(res.error ?? "Registration failed");
    } catch {
      setError("Signature was rejected.");
    } finally {
      setBusy(false);
    }
  };

  const doLogin = async () => {
    setError(null);
    if (!wallet || !signMessage) {
      setError("Connect a wallet that can sign messages (e.g. Phantom).");
      return;
    }
    setBusy(true);
    try {
      const ts = Date.now();
      const signature = await sign(loginMessage(wallet, ts));
      const res = await onLogin({ wallet, signature, ts });
      if (!res.ok) setError(res.error ?? "Sign-in failed");
    } catch {
      setError("Signature was rejected.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
      <h2 className="text-base font-semibold tracking-tight text-slate-900">
        {known ? "Welcome back" : "Register to play"}
      </h2>
      <p className="text-sm text-slate-500">
        {known ? (
          <>
            This wallet is already registered as{" "}
            <span className="font-semibold text-slate-700">{known.nickname}</span>.
            Sign a message to prove it&apos;s you and pick up right where you left
            off — your points and picks are safe.
          </>
        ) : (
          <>
            Connect your Solana wallet and pick a nickname. You&apos;ll sign a
            message to prove the wallet is yours — it becomes your identity, where
            prizes pay out, and how pot eligibility is checked. One-time, no edits.
          </>
        )}
      </p>
      {connected && publicKey ? (
        <div className="flex w-fit items-center gap-2 rounded-full border border-green-200 bg-green-50 px-3 py-1.5">
          <span className="h-2 w-2 rounded-full bg-green-500" />
          <span className="font-mono text-xs text-slate-700">
            {publicKey.toBase58().slice(0, 4)}…{publicKey.toBase58().slice(-4)}
          </span>
          <button
            type="button"
            onClick={() => void disconnect()}
            className="text-xs font-medium text-slate-400 transition-colors hover:text-slate-600"
          >
            Disconnect
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setVisible(true)}
          className="inline-flex w-fit items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-transform hover:-translate-y-0.5"
        >
          <Icon name="coins" size={16} />
          Connect wallet
        </button>
      )}

      {error && <p className="text-sm font-medium text-red-600">{error}</p>}

      {checking ? (
        <p className="text-sm text-slate-400">Checking this wallet…</p>
      ) : known ? (
        <button
          type="button"
          onClick={doLogin}
          disabled={busy}
          className="w-fit rounded-full bg-green-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-50"
        >
          {busy ? "Signing…" : `Sign in as ${known.nickname}`}
        </button>
      ) : (
        <>
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Nickname (3–20 chars)"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-green-500/40 focus:ring-2"
          />
          <button
            type="button"
            onClick={doRegister}
            disabled={busy || !connected}
            className="w-fit rounded-full bg-green-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-50"
          >
            {busy ? "Signing…" : connected ? "Sign & register" : "Connect wallet first"}
          </button>
        </>
      )}
    </section>
  );
}

// ── Telegram wallet link ───────────────────────────────────────────────────────

// Shown when a Telegram player opens /predict?link=<token> from the Mini App.
// They connect a wallet and sign to bind it to their Telegram account, which is
// what makes them eligible for the $GOLAZO-gated pot.
function LinkWalletPanel({ token }: { token: string }) {
  const { publicKey, signMessage, connected, disconnect } = useWallet();
  const { setVisible } = useWalletModal();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (!publicKey || !signMessage) {
      setError("Connect a wallet that can sign messages (e.g. Phantom).");
      return;
    }
    setBusy(true);
    try {
      const wallet = publicKey.toBase58();
      const ts = Date.now();
      const signature = toBase64(
        await signMessage(new TextEncoder().encode(linkMessage(wallet, token, ts))),
      );
      const res = await fetch("/api/predict/link/finish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, wallet, signature, ts }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; nickname?: string };
      if (!res.ok || !data.ok) setError(data.error ?? "Linking failed");
      else setDone(data.nickname ?? "");
    } catch {
      setError("Signature was rejected.");
    } finally {
      setBusy(false);
    }
  };

  if (done !== null) {
    return (
      <section className="flex flex-col gap-3 rounded-2xl border border-green-200 bg-green-50 p-5 shadow-card">
        <h2 className="flex items-center gap-2 text-base font-semibold text-green-800">
          <Icon name="check" size={18} className="text-green-600" />
          Wallet linked
        </h2>
        <p className="text-sm text-green-800">
          {done ? <><span className="font-bold">{done}</span> is all set. </> : null}
          Your wallet is now tied to your Telegram account — head back to Telegram
          and your pot eligibility will show there.
        </p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
      <h2 className="text-base font-semibold tracking-tight text-slate-900">
        Link a wallet to your Telegram account
      </h2>
      <p className="text-sm text-slate-500">
        Connect your Solana wallet and sign once to prove it&apos;s yours. It
        becomes how the weekly $GOLAZO pot checks eligibility and where prizes pay
        out. One-time — your picks and points are unaffected.
      </p>
      {connected && publicKey ? (
        <div className="flex w-fit items-center gap-2 rounded-full border border-green-200 bg-green-50 px-3 py-1.5">
          <span className="h-2 w-2 rounded-full bg-green-500" />
          <span className="font-mono text-xs text-slate-700">
            {publicKey.toBase58().slice(0, 4)}…{publicKey.toBase58().slice(-4)}
          </span>
          <button
            type="button"
            onClick={() => void disconnect()}
            className="text-xs font-medium text-slate-400 transition-colors hover:text-slate-600"
          >
            Disconnect
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setVisible(true)}
          className="inline-flex w-fit items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-transform hover:-translate-y-0.5"
        >
          <Icon name="coins" size={16} />
          Connect wallet
        </button>
      )}
      {error && <p className="text-sm font-medium text-red-600">{error}</p>}
      <button
        type="button"
        onClick={submit}
        disabled={busy || !connected}
        className="w-fit rounded-full bg-green-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-50"
      >
        {busy ? "Signing…" : connected ? "Sign & link wallet" : "Connect wallet first"}
      </button>
    </section>
  );
}

// ── Slate ─────────────────────────────────────────────────────────────────────

// Live, per-second countdown to a match's kickoff (when picks lock). Isolated so
// only this tiny node re-renders each second, not the whole slate/leaderboard.
function LockCountdown({ kickoffMs }: { kickoffMs: number }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  if (now === null) return <span className="text-slate-300">—</span>;
  const diff = kickoffMs - now;
  if (diff <= 0)
    return <span className="font-semibold text-amber-600">Locked</span>;
  return (
    <span suppressHydrationWarning className="tabular-nums text-slate-500">
      Locks in {formatCountdownPrecise(diff)}
    </span>
  );
}

function SlateRow({
  entry,
  pick,
  locked,
  onPick,
  onLock,
}: {
  entry: SlateEntry;
  pick: string | undefined;
  locked: boolean;
  onPick: (matchId: string, value: string) => void;
  onLock: (matchId: string) => void;
}) {
  const { match, options } = entry;
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-card">
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>
          {match.groupOrRound} · <LocalTime date={match.date} time={match.time} />
        </span>
        {locked ? (
          <span className="inline-flex items-center gap-1 font-semibold text-green-600">
            <Icon name="check" size={12} /> Locked
          </span>
        ) : (
          <LockCountdown kickoffMs={getKickoffMs(match)} />
        )}
      </div>
      <div className="flex gap-2">
        {options.map((o) => {
          const active = pick === o.value;
          return (
            <button
              key={o.value}
              type="button"
              disabled={locked}
              onClick={() => onPick(match.id, o.value)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-sm font-semibold transition-colors ${
                active
                  ? "border-green-600 bg-green-50 text-green-700"
                  : "border-slate-200 text-slate-700 hover:bg-slate-50"
              } ${locked && !active ? "opacity-40" : ""} ${locked ? "cursor-default" : ""}`}
            >
              {o.flagCode !== null && <Flag code={o.flagCode} className="text-sm" />}
              {o.label}
            </button>
          );
        })}
      </div>
      {pick && !locked && (
        <button
          type="button"
          onClick={() => onLock(match.id)}
          className="self-end text-xs font-semibold text-slate-500 underline underline-offset-2 hover:text-slate-800"
        >
          Lock this pick
        </button>
      )}
    </div>
  );
}

// ── Leaderboard ───────────────────────────────────────────────────────────────

function LeaderboardTable({
  rows,
  meNickname,
}: {
  rows: LeaderboardRow[];
  meNickname: string | null;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-slate-400">No scores yet — get predicting.</p>;
  }
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-400">
          <tr>
            <th className="px-3 py-2 font-medium">#</th>
            <th className="px-3 py-2 font-medium">Player</th>
            <th className="px-3 py-2 text-right font-medium">Hit</th>
            <th className="px-3 py-2 text-right font-medium">Pts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const me = meNickname !== null && r.nickname === meNickname;
            return (
              <tr
                key={`${r.nickname}-${i}`}
                className={`border-t border-slate-100 ${me ? "bg-green-50" : ""}`}
              >
                <td className="px-3 py-2 tabular-nums text-slate-400">{i + 1}</td>
                <td className="px-3 py-2">
                  <span className="font-semibold text-slate-900">{r.nickname}</span>
                  <span className="ml-2 font-mono text-[11px] text-slate-400">
                    {r.wallet}
                  </span>
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-slate-500">
                  {r.correct}/{r.played}
                </td>
                <td className="px-3 py-2 text-right font-bold tabular-nums text-green-600">
                  {r.points}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function PredictPage() {
  const { reg, picks, locked, eligibility, loaded, register, login, submitPick, lockPick } =
    usePrediction();
  const { liveByMatchId } = useLiveMatches();
  const { data: leaderboard } = usePredictionLeaderboard();
  const { golazo } = useTokenAddresses();

  const [now, setNow] = useState<number | null>(null);
  const [tab, setTab] = useState<"week" | "season">("week");
  const [toast, setToast] = useState<string | null>(null);
  const [confirmLock, setConfirmLock] = useState<string | null>(null);
  // Telegram wallet-link hand-off: /predict?link=<token>. Read from the URL on
  // the client (avoids a Suspense boundary for useSearchParams on a static page).
  const [linkToken, setLinkToken] = useState<string | null>(null);

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("link");
    if (t) setLinkToken(t);
  }, []);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(id);
  }, [toast]);

  const slate = useMemo(
    () => buildSlate(now, liveByMatchId),
    [now, liveByMatchId],
  );

  const onPick = async (matchId: string, value: string) => {
    const res = await submitPick(matchId, value);
    if (!res.ok) setToast(res.error ?? "Could not save pick");
  };

  const doLock = async () => {
    if (!confirmLock) return;
    const res = await lockPick(confirmLock);
    setConfirmLock(null);
    if (!res.ok) setToast(res.error ?? "Could not lock pick");
  };

  const rows = tab === "week" ? leaderboard?.week ?? [] : leaderboard?.season ?? [];

  const topThisWeek = leaderboard?.week?.[0];
  const isWeekWinner =
    reg !== null &&
    (topThisWeek?.played ?? 0) > 0 &&
    topThisWeek?.nickname === reg.nickname;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6 md:py-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Predict &amp; Win
        </h1>
        <p className="text-sm text-slate-500">
          Call the result of each match — 1 point per correct pick. Top the
          weekly board to win SOL. Picks lock at kickoff.
        </p>
        {process.env.NEXT_PUBLIC_TELEGRAM_APP_URL && (
          <a
            href={process.env.NEXT_PUBLIC_TELEGRAM_APP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-fit items-center gap-1.5 rounded-full bg-[#229ED9] px-4 py-2 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
          >
            Play on Telegram
            <Icon name="right" size={15} strokeWidth={2.5} />
          </a>
        )}
      </header>

      {linkToken ? (
        <LinkWalletPanel token={linkToken} />
      ) : !loaded ? (
        <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />
      ) : !reg ? (
        <RegistrationForm onRegister={register} onLogin={login} />
      ) : (
        <>
          <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-800">
            <Icon name="check" size={15} className="text-green-600" />
            Playing as <span className="font-bold">{reg.nickname}</span>
          </div>

          {eligibility &&
            (eligibility.threshold <= 0 ? (
              <p className="text-xs text-slate-500">
                Open entry — anyone can predict, no $GOLAZO needed.
              </p>
            ) : eligibility.eligible ? (
              <p className="inline-flex w-fit items-center gap-1.5 text-xs font-medium text-green-700">
                <Icon name="check" size={13} />
                You&apos;re in for the weekly pot — holding enough $GOLAZO.
              </p>
            ) : (
              <p className="flex flex-wrap items-center gap-1.5 text-xs text-amber-700">
                <Icon name="fire" size={13} className="text-orange-500" />
                Hold {eligibility.threshold.toLocaleString()} $GOLAZO to qualify
                for the pot — you have{" "}
                {(eligibility.golazoBalance ?? 0).toLocaleString()}.
                {golazo.meteoraUrl && (
                  <a
                    href={golazo.meteoraUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-green-700 underline underline-offset-2 hover:text-green-800"
                  >
                    Get $GOLAZO
                  </a>
                )}
              </p>
            ))}

          <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm text-slate-600">Flex your standing</span>
              <ShareButtons
                text="I'm predicting the World Cup on Golazo ⚽ Beat my picks?"
                path={`/s/predictor/${encodeURIComponent(reg.nickname)}`}
              />
            </div>
            {isWeekWinner && (
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2">
                <span className="text-sm font-semibold text-amber-600">
                  🏆 You&apos;re #1 this week
                </span>
                <ShareButtons
                  text="Just won this week's SOL bounty on Golazo 🏆 Think you can beat me?"
                  path={`/s/winner/${encodeURIComponent(reg.nickname)}`}
                />
              </div>
            )}
          </div>

          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">
              Upcoming matches
            </h2>
            {slate.length === 0 ? (
              <p className="text-sm text-slate-400">
                No open matches right now. Check back before the next kickoff.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {slate.map((entry) => (
                  <SlateRow
                    key={entry.match.id}
                    entry={entry}
                    pick={picks[entry.match.id]}
                    locked={locked.includes(entry.match.id)}
                    onPick={onPick}
                    onLock={setConfirmLock}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {!linkToken && (
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">
            Leaderboard
          </h2>
          <div className="flex gap-0.5 rounded-full bg-slate-100 p-1 text-xs font-semibold">
            {(["week", "season"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`rounded-full px-3 py-1 transition-colors ${
                  tab === t ? "bg-white text-green-600 shadow-sm" : "text-slate-500"
                }`}
              >
                {t === "week" ? "This Matchday" : "Season"}
              </button>
            ))}
          </div>
        </div>
        <LeaderboardTable rows={rows} meNickname={reg?.nickname ?? null} />
      </section>
      )}

      {toast && (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-lg">
          {toast}
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
