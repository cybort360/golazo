"use client";

import Link from "next/link";
import { useBurns } from "@/hooks/useBurns";
import { TEAMS } from "@/constants/teams";
import { Flag } from "@/components/Flag";
import { Icon } from "@/components/Icon";

const NAME_BY_TICKER = new Map(TEAMS.map((t) => [t.ticker, t.name]));
const FLAG_BY_TICKER = new Map(TEAMS.map((t) => [t.ticker, t.flagCode]));

function BurnRow({
  ticker,
  percentBurned,
}: {
  ticker: string;
  percentBurned: number;
}) {
  const isTeam = NAME_BY_TICKER.has(ticker);
  const name = NAME_BY_TICKER.get(ticker) ?? ticker;

  const body = (
    <div className="flex items-center gap-3">
      {isTeam ? (
        <Flag code={FLAG_BY_TICKER.get(ticker) ?? null} className="shrink-0 text-base" />
      ) : (
        <Icon name="fire" size={16} className="shrink-0 text-orange-500" />
      )}
      <span className="flex w-24 shrink-0 flex-col leading-tight">
        <span className="truncate text-sm font-semibold text-slate-900">
          {name}
        </span>
        <span className="text-[11px] text-slate-400">${ticker}</span>
      </span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-orange-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400 transition-[width] duration-500"
          style={{ width: `${Math.max(2, percentBurned)}%` }}
        />
      </div>
      <span className="w-16 shrink-0 text-right text-sm font-bold tabular-nums text-orange-600">
        {percentBurned.toFixed(2)}%
      </span>
    </div>
  );

  return isTeam ? (
    <Link
      href={`/token/${ticker}`}
      className="rounded-lg px-1 py-1.5 transition-colors hover:bg-orange-100/50"
    >
      {body}
    </Link>
  ) : (
    <div className="px-1 py-1.5">{body}</div>
  );
}

// Deflation leaderboard: how much of each launched token's supply has been
// burned, straight from on-chain supply. Hidden until at least one token is
// launched and has burns to show.
export default function BurnTracker() {
  const { burns } = useBurns();
  if (burns.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="inline-flex items-center gap-1.5 text-sm font-semibold uppercase tracking-widest text-slate-400">
        <Icon name="fire" size={15} className="text-orange-500" />
        Burn Tracker
      </h2>
      <div className="flex flex-col gap-1 rounded-2xl border border-orange-200 bg-orange-50/40 p-4 shadow-card">
        {burns.map((b) => (
          <BurnRow
            key={b.ticker}
            ticker={b.ticker}
            percentBurned={b.percentBurned}
          />
        ))}
        <p className="mt-2 text-[11px] text-slate-400">
          Supply bought back and burned forever after wins. Verify any mint on
          Solscan.
        </p>
      </div>
    </section>
  );
}
