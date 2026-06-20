"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePrizePool } from "@/hooks/usePrizePool";
import { useWeeklyPrize } from "@/hooks/useWeeklyPrize";
import { useMatchResults } from "@/hooks/useMatchResults";
import { useTokenAddresses } from "@/hooks/useTokenAddresses";
import { FEE_SPLIT, FUTURE_FUND_SPLIT } from "@/lib/fees";
import { formatSol, formatUsd, shortenAddress } from "@/lib/format";
import { getKickoffMs } from "@/lib/schedule";
import { formatCountdownPrecise } from "@/lib/time";
import { safeHttpUrl } from "@/lib/url";
import { SCHEDULE } from "@/constants/schedule";
import { TEAMS, type Team } from "@/constants/teams";
import { Icon } from "@/components/Icon";
import { Flag } from "@/components/Flag";
import { LocalTime } from "@/components/LocalTime";

const RPC_URL =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ??
  "https://api.mainnet-beta.solana.com";

// NEXT_PUBLIC_* must be referenced literally so Next can inline them.
const WALLETS = [
  {
    label: "Prize Pool",
    address: process.env.NEXT_PUBLIC_PRIZE_POOL_WALLET ?? "",
    desc: "Paid to champion token holders",
  },
  {
    label: "Buybacks",
    address: process.env.NEXT_PUBLIC_BUYBACK_WALLET ?? "",
    desc: "Buy & burn $GOLAZO",
  },
  {
    label: "Future Fund",
    address: process.env.NEXT_PUBLIC_FUTURE_FUND_WALLET ?? "",
    desc: "Seeds next tournament + holder rewards",
  },
];

const BUCKETS = [
  {
    label: "Prize Pool",
    pct: FEE_SPLIT.prizePool,
    color: "#10b981",
    desc: "Distributed to champion token holders",
  },
  {
    label: "Buybacks",
    pct: FEE_SPLIT.buyback,
    color: "#f59e0b",
    desc: "Buy & burn $GOLAZO",
  },
  {
    label: "Future Fund",
    pct: FEE_SPLIT.futureFund,
    color: "#a78bfa",
    desc: "Seeds the next tournament + rewards holders",
  },
];

const STEPS = [
  "Every trade generates creator fees.",
  "Fees split across 3 wallets automatically.",
  "After the final, champion holders receive a SOL airdrop.",
];

async function fetchSolBalance(address: string): Promise<number | null> {
  if (!address) return null;
  try {
    const res = await fetch(RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getBalance",
        params: [address],
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { result?: { value?: number } };
    const lamports = data.result?.value;
    return typeof lamports === "number" ? lamports / 1e9 : null;
  } catch {
    return null;
  }
}

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

function ago(ms: number, now: number): string {
  const s = Math.max(0, Math.floor((now - ms) / 1000));
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  return `${m}m ago`;
}

function teamByTicker(ticker: string): Team | undefined {
  return TEAMS.find((t) => t.ticker === ticker);
}

// A team name + a buy link: Jupiter derived from the mint, plus the live Axiom URL.
function WeeklyBuy({
  ticker,
  liveTeams,
}: {
  ticker: string;
  liveTeams: Team[];
}) {
  const team = teamByTicker(ticker);
  if (!team) return null;
  const live = liveTeams.find((t) => t.ticker === ticker);
  const address = live?.tokenAddress ?? team.tokenAddress;
  const jupiterUrl = address ? `https://jup.ag/tokens/${address}` : null;
  const axiomUrl = safeHttpUrl(live?.axiomUrl ?? team.axiomUrl);

  return (
    <div className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-200 bg-white p-3">
      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-800">
        <Flag code={team.flagCode} className="text-base" />
        {team.name}
      </span>
      {!team.listed ? (
        <span className="rounded-full bg-slate-100 px-4 py-1.5 text-xs font-medium text-slate-400">
          Not listed
        </span>
      ) : jupiterUrl ? (
        <a
          href={jupiterUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full bg-green-600 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-green-700"
        >
          Hold ${ticker} to win
        </a>
      ) : (
        <span className="rounded-full bg-slate-100 px-4 py-1.5 text-xs font-medium text-slate-400">
          Not launched
        </span>
      )}
      {axiomUrl && (
        <a
          href={axiomUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] font-medium text-slate-400 hover:text-green-600"
        >
          Trade on Axiom
        </a>
      )}
    </div>
  );
}

function WeeklyPrizeSection({ now }: { now: number | null }) {
  const { current, history } = useWeeklyPrize();
  const { results } = useMatchResults();
  const { teams: liveTeams } = useTokenAddresses();

  if (!current && history.length === 0) return null;

  const match = current
    ? SCHEDULE.find((m) => m.id === current.matchId)
    : undefined;
  const result = current
    ? results.find((r) => r.matchId === current.matchId)
    : undefined;
  const winnerTicker =
    current?.winnerTeamId ??
    (result && !result.isDraw ? result.winner : null);
  const winnerTeam = winnerTicker ? teamByTicker(winnerTicker) : undefined;
  const upcoming = current && !result;

  return (
    <section className="flex flex-col gap-4">
      <h2 className="label tracking-widest">Weekly Prize</h2>

      {current && match && (
        <div className="flex flex-col gap-4 rounded-2xl border border-green-200 bg-gradient-to-b from-green-50 to-white p-5 shadow-card">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-widest text-green-700">
              Week {current.week} · This Week&apos;s Prize Match
            </span>
            <span className="text-xl font-bold tabular-nums text-green-700">
              {current.potSol} SOL
            </span>
          </div>

          <div className="flex items-center justify-center gap-3 text-center">
            <span className="inline-flex items-center gap-1.5 text-base font-bold text-slate-900">
              <Flag code={teamByTicker(match.teamA)?.flagCode ?? null} className="text-xl" />
              {match.teamA}
            </span>
            <span className="text-sm font-semibold text-slate-400">vs</span>
            <span className="inline-flex items-center gap-1.5 text-base font-bold text-slate-900">
              <Flag code={teamByTicker(match.teamB)?.flagCode ?? null} className="text-xl" />
              {match.teamB}
            </span>
          </div>

          <div className="text-center text-sm text-slate-500">
            <LocalTime date={match.date} time={match.time} /> ·{" "}
            {match.groupOrRound}
          </div>

          {upcoming ? (
            <>
              <div className="text-center">
                <div className="label">Kickoff in</div>
                <div
                  suppressHydrationWarning
                  className="text-2xl font-bold tabular-nums text-slate-900 md:text-3xl"
                >
                  {now !== null
                    ? formatCountdownPrecise(getKickoffMs(match) - now)
                    : "—"}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <WeeklyBuy ticker={match.teamA} liveTeams={liveTeams} />
                <WeeklyBuy ticker={match.teamB} liveTeams={liveTeams} />
              </div>
              <p className="text-center text-xs text-slate-400">
                Hold the winning team when the final whistle blows to share the
                pot.
              </p>
            </>
          ) : result && result.isDraw ? (
            <div className="rounded-xl bg-amber-50 px-4 py-3 text-center text-sm font-semibold text-amber-600">
              Draw. The pot rolls over to next week.
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 rounded-xl bg-green-50 px-4 py-4 text-center">
              <span className="inline-flex items-center gap-1.5 text-base font-bold text-slate-900">
                <Icon name="trophy" size={18} className="text-amber-500" />
                {winnerTeam ? (
                  <>
                    <Flag code={winnerTeam.flagCode} className="text-lg" />
                    {winnerTeam.name}
                  </>
                ) : (
                  winnerTicker
                )}{" "}
                win
              </span>
              {current.status === "paid" && current.txHash ? (
                <a
                  href={`https://solscan.io/tx/${current.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm font-semibold text-green-600 hover:text-green-700"
                >
                  Paid, view on Solscan
                  <Icon name="upRight" size={13} />
                </a>
              ) : (
                <span className="text-sm text-slate-500">
                  Winner announced, payout in progress.
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {history.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Past Winners
          </h3>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-card">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wider text-slate-400">
                  <th className="px-4 py-3 font-medium">Week</th>
                  <th className="px-4 py-3 font-medium">Match</th>
                  <th className="px-4 py-3 font-medium">Winner</th>
                  <th className="px-4 py-3 text-right font-medium">Pot</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {[...history]
                  .sort((a, b) => b.week - a.week)
                  .map((h) => {
                    const m = SCHEDULE.find((s) => s.id === h.matchId);
                    const wt = h.winnerTeamId
                      ? teamByTicker(h.winnerTeamId)
                      : undefined;
                    return (
                      <tr
                        key={h.week}
                        className="border-b border-slate-100 last:border-b-0"
                      >
                        <td className="px-4 py-3 tabular-nums text-slate-500">
                          {h.week}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {m ? `${m.teamA} v ${m.teamB}` : h.matchId}
                        </td>
                        <td className="px-4 py-3">
                          {wt ? (
                            <span className="inline-flex items-center gap-1.5 font-medium text-slate-900">
                              <Flag code={wt.flagCode} className="text-sm" />
                              {wt.name}
                            </span>
                          ) : (
                            <span className="text-slate-400">Rolled over</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                          {h.potSol} SOL
                        </td>
                        <td className="px-4 py-3 capitalize text-slate-500">
                          {h.status.replace("_", " ")}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

export default function PrizePoolPage() {
  const { balanceSOL, balanceUSD, futureFundSOL, updatedAt } = usePrizePool();
  const [balances, setBalances] = useState<Record<string, number | null>>({});
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 1_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const entries = await Promise.all(
        WALLETS.map(async (w) => [w.label, await fetchSolBalance(w.address)] as const),
      );
      if (!cancelled) setBalances(Object.fromEntries(entries));
    };
    void load();
    const id = setInterval(() => void load(), 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-10 px-4 py-8 md:px-8">
      {/* Header */}
      <header className="flex flex-col items-center gap-2 text-center">
        <h1 className="inline-flex items-center gap-2 text-3xl font-semibold uppercase tracking-tight text-slate-900 md:text-4xl">
          <Icon name="trophy" size={28} className="text-amber-500" /> The Prize
          Pool
        </h1>
        <div className="mt-2 text-4xl font-bold tabular-nums text-green-600 md:text-5xl">
          {balanceSOL !== null ? formatSol(balanceSOL) : "—"}
        </div>
        {balanceUSD !== null && (
          <div className="text-lg text-slate-400">≈ {formatUsd(balanceUSD)}</div>
        )}
        <p className="mt-1 max-w-md text-sm text-slate-500">
          Distributed to champion token holders after the final.
        </p>
        <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-500 shadow-card">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
          </span>
          Live on-chain
          <span className="text-slate-300">·</span>
          <span suppressHydrationWarning>
            {updatedAt && now ? `verified ${ago(updatedAt, now)}` : "verifying…"}
          </span>
        </div>
      </header>

      {/* Trust note */}
      <p className="-mt-6 text-center text-xs text-slate-400">
        Every balance below is read directly from Solana. Nothing is
        self-reported. Verify any wallet on Solscan.
      </p>

      {/* Weekly Prize */}
      <WeeklyPrizeSection now={now} />

      {/* Fee split */}
      <section className="flex flex-col gap-4">
        <h2 className="label tracking-widest">Where Trading Fees Go</h2>
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
          {BUCKETS.map((b) => (
            <div
              key={b.label}
              style={{ width: `${b.pct * 100}%`, background: b.color }}
              title={`${b.label} ${pct(b.pct)}`}
            />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {BUCKETS.map((b) => (
            <div
              key={b.label}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-card"
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: b.color }}
                />
                <span className="text-lg font-bold tabular-nums text-slate-900">
                  {pct(b.pct)}
                </span>
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-700">
                {b.label}
              </div>
              <div className="mt-0.5 text-xs text-slate-400">{b.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Future Fund */}
      <section className="flex flex-col gap-3 rounded-2xl border border-violet-200 bg-violet-50 p-5 shadow-card">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="inline-flex items-center gap-1.5 text-sm font-bold uppercase tracking-widest text-violet-600">
            <Icon name="leaf" size={15} /> Future Fund
          </h2>
          <span className="text-2xl font-bold tabular-nums text-slate-900">
            {futureFundSOL !== null ? formatSol(futureFundSOL) : "—"}
          </span>
        </div>
        <p className="text-sm text-slate-600">
          After the tournament, this distributes to $GOLAZO holders and loyal
          traders.
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
          <span>{pct(FUTURE_FUND_SPLIT.nextTournamentSeed)} next tournament seed</span>
          <span>{pct(FUTURE_FUND_SPLIT.golazoHolders)} $GOLAZO holders</span>
          <span>{pct(FUTURE_FUND_SPLIT.loyaltyDrop)} loyalty drop</span>
        </div>
      </section>

      {/* Wallet transparency */}
      <section className="flex flex-col gap-3">
        <h2 className="label tracking-widest">Wallet Transparency</h2>
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-card">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3 font-medium">Wallet</th>
                <th className="px-4 py-3 font-medium">Address</th>
                <th className="px-4 py-3 text-right font-medium">Balance</th>
                <th className="px-4 py-3 text-right font-medium">Solscan</th>
              </tr>
            </thead>
            <tbody>
              {WALLETS.map((w) => {
                const bal = balances[w.label];
                return (
                  <tr
                    key={w.label}
                    className="border-b border-slate-100 transition-colors last:border-b-0 hover:bg-slate-50"
                  >
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">
                        {w.label}
                      </div>
                      <div className="text-xs text-slate-400">{w.desc}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">
                      {w.address ? shortenAddress(w.address, 6, 6) : "Not configured"}
                    </td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums text-slate-900">
                      {bal !== null && bal !== undefined ? formatSol(bal) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {w.address ? (
                        <a
                          href={`https://solscan.io/account/${w.address}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-medium text-green-600 hover:text-green-700"
                        >
                          View
                          <Icon name="upRight" size={13} />
                        </a>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* How it works */}
      <section className="flex flex-col gap-3">
        <h2 className="label tracking-widest">How It Works</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <div
              key={i}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-card"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-green-50 text-sm font-bold text-green-600">
                {i + 1}
              </div>
              <p className="mt-2 text-sm text-slate-600">{step}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="flex justify-center">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm font-medium text-slate-400 transition-colors hover:text-green-600"
        >
          <Icon name="left" size={14} />
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
