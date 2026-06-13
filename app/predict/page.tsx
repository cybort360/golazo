"use client";

import { useEffect, useMemo, useState } from "react";
import { SCHEDULE, type ScheduledMatch } from "@/constants/schedule";
import { TEAMS } from "@/constants/teams";
import { getKickoffMs } from "@/lib/schedule";
import { DRAW } from "@/lib/predictions";
import { usePrediction } from "@/hooks/usePrediction";
import {
  usePredictionLeaderboard,
  type LeaderboardRow,
} from "@/hooks/usePredictionLeaderboard";
import { useLiveMatches } from "@/hooks/useLiveMatches";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { registerMessage } from "@/lib/predictAuth";
import { Flag } from "@/components/Flag";
import { Icon } from "@/components/Icon";
import { LocalTime } from "@/components/LocalTime";
import ShareButtons from "@/components/ShareButtons";

/** base64-encode a signature byte array in the browser (no Buffer). */
function toBase64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

const TICKERS = new Set(TEAMS.map((t) => t.ticker));
const TEAM_BY_TICKER = new Map(TEAMS.map((t) => [t.ticker, t]));

interface PickOption {
  value: string; // ticker or DRAW
  label: string;
  flagCode: string | null;
}

interface SlateEntry {
  match: ScheduledMatch;
  options: PickOption[];
}

function teamOption(ticker: string): PickOption {
  const t = TEAM_BY_TICKER.get(ticker);
  return { value: ticker, label: ticker, flagCode: t?.flagCode ?? null };
}

/** Upcoming matches with known participants, soonest first. */
function buildSlate(
  now: number | null,
  liveByMatchId: Record<string, { homeTicker: string; awayTicker: string }>,
): SlateEntry[] {
  if (now === null) return [];
  const entries: SlateEntry[] = [];
  for (const m of SCHEDULE) {
    if (getKickoffMs(m) <= now) continue; // already kicked off / locked
    if (TICKERS.has(m.teamA) && TICKERS.has(m.teamB)) {
      entries.push({
        match: m,
        options: [
          teamOption(m.teamA),
          { value: DRAW, label: "Draw", flagCode: null },
          teamOption(m.teamB),
        ],
      });
    } else {
      const live = liveByMatchId[m.id];
      if (live && TICKERS.has(live.homeTicker) && TICKERS.has(live.awayTicker)) {
        entries.push({
          match: m,
          options: [teamOption(live.homeTicker), teamOption(live.awayTicker)],
        });
      }
    }
  }
  return entries
    .sort((a, b) => getKickoffMs(a.match) - getKickoffMs(b.match))
    .slice(0, 12);
}

// ── Registration ──────────────────────────────────────────────────────────────

function RegistrationForm({
  onRegister,
}: {
  onRegister: (payload: {
    nickname: string;
    wallet: string;
    signature: string;
    ts: number;
  }) => Promise<{ ok: boolean; error?: string }>;
}) {
  const { publicKey, signMessage, connected, disconnect } = useWallet();
  const { setVisible } = useWalletModal();
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
      const message = registerMessage(wallet, ts);
      const signature = toBase64(await signMessage(new TextEncoder().encode(message)));
      const res = await onRegister({ nickname, wallet, signature, ts });
      if (!res.ok) setError(res.error ?? "Registration failed");
    } catch {
      setError("Signature was rejected.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
      <h2 className="text-base font-semibold tracking-tight text-slate-900">
        Register to play
      </h2>
      <p className="text-sm text-slate-500">
        Connect your Solana wallet and pick a nickname. You&apos;ll sign a
        message to prove the wallet is yours — it becomes your identity, where
        prizes pay out, and how pot eligibility is checked. One-time, no edits.
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
      <input
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
        placeholder="Nickname (3–20 chars)"
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-green-500/40 focus:ring-2"
      />
      {error && <p className="text-sm font-medium text-red-600">{error}</p>}
      <button
        type="button"
        onClick={submit}
        disabled={busy || !connected}
        className="w-fit rounded-full bg-green-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-50"
      >
        {busy ? "Signing…" : connected ? "Sign & register" : "Connect wallet first"}
      </button>
    </section>
  );
}

// ── Slate ─────────────────────────────────────────────────────────────────────

function SlateRow({
  entry,
  pick,
  onPick,
}: {
  entry: SlateEntry;
  pick: string | undefined;
  onPick: (matchId: string, value: string) => void;
}) {
  const { match, options } = entry;
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-card">
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>{match.groupOrRound}</span>
        <LocalTime date={match.date} time={match.time} />
      </div>
      <div className="flex gap-2">
        {options.map((o) => {
          const active = pick === o.value;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onPick(match.id, o.value)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-sm font-semibold transition-colors ${
                active
                  ? "border-green-600 bg-green-50 text-green-700"
                  : "border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              {o.flagCode !== null && <Flag code={o.flagCode} className="text-sm" />}
              {o.label}
            </button>
          );
        })}
      </div>
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
  const { reg, picks, loaded, register, submitPick } = usePrediction();
  const { liveByMatchId } = useLiveMatches();
  const { data: leaderboard } = usePredictionLeaderboard();

  const [now, setNow] = useState<number | null>(null);
  const [tab, setTab] = useState<"week" | "season">("week");
  const [toast, setToast] = useState<string | null>(null);

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
        {(leaderboard?.minGolazo ?? 0) > 0 && (
          <p className="inline-flex w-fit items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
            <Icon name="fire" size={13} className="text-orange-500" />
            Hold ≥ {leaderboard?.minGolazo?.toLocaleString()} $GOLAZO to be
            eligible for the weekly pot.
          </p>
        )}
      </header>

      {!loaded ? (
        <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />
      ) : !reg ? (
        <RegistrationForm onRegister={register} />
      ) : (
        <>
          <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-800">
            <Icon name="check" size={15} className="text-green-600" />
            Playing as <span className="font-bold">{reg.nickname}</span>
          </div>

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
                    onPick={onPick}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}

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
                {t === "week" ? "This Week" : "Season"}
              </button>
            ))}
          </div>
        </div>
        <LeaderboardTable rows={rows} meNickname={reg?.nickname ?? null} />
      </section>

      {toast && (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
