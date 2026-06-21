"use client";

import { useEffect, useState } from "react";
import { TEAMS } from "@/constants/teams";
import { useBuybackHistory } from "@/hooks/useBuybackHistory";
import { useBurns } from "@/hooks/useBurns";
import { BURN_INITIAL_SUPPLY } from "@/lib/burns";
import { safeHttpUrl } from "@/lib/url";
import { Flag } from "@/components/Flag";
import { Icon } from "@/components/Icon";

// One unified "Buybacks & Burns" feed: the per-token deflation leaderboard
// (live on-chain supply via useBurns) on top, the recent buyback events
// (useBuybackHistory) below — replacing the two separate sections.

const NAME_BY_TICKER = new Map(TEAMS.map((t) => [t.ticker, t.name]));
const FLAG_BY_TICKER = new Map(TEAMS.map((t) => [t.ticker, t.flagCode]));

function formatTimeAgo(timestamp: number, now: number): string {
  const seconds = Math.max(0, Math.floor((now - timestamp) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// Compact token count: "9,505", "1.2M", "340M". Small burns stay exact so a
// test burn is legible; large ones abbreviate to fit the column.
function formatBurned(n: number): string {
  if (n <= 0) return "0";
  if (n >= 1_000_000)
    return `${(n / 1_000_000).toLocaleString("en-US", {
      maximumFractionDigits: 1,
    })}M`;
  return Math.round(n).toLocaleString("en-US");
}

// A 1-token burn is 0.0000001% of supply, so a 2-decimal percent rounds to
// 0.00% and hides real activity. Lead with the burned token count; keep the
// percent as a secondary line, with a "<0.01%" floor so it never reads a flat 0
// while tokens have actually been burned.
function BurnBar({
  ticker,
  pct,
  currentSupply,
}: {
  ticker: string;
  pct: number;
  currentSupply: number;
}) {
  const isTeam = NAME_BY_TICKER.has(ticker);
  const burned = Math.max(0, BURN_INITIAL_SUPPLY - currentSupply);
  const pctLabel =
    burned <= 0 ? "0%" : pct < 0.01 ? "<0.01%" : `${pct.toFixed(2)}%`;
  return (
    <div className="flex items-center gap-3">
      {isTeam ? (
        <Flag code={FLAG_BY_TICKER.get(ticker) ?? null} className="shrink-0 text-base" />
      ) : (
        <Icon name="fire" size={15} className="shrink-0 text-orange-500" />
      )}
      <span className="w-16 shrink-0 truncate text-sm font-semibold text-slate-900">
        ${ticker}
      </span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-orange-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400"
          style={{ width: `${Math.max(2, pct)}%` }}
        />
      </div>
      <div className="flex w-20 shrink-0 flex-col items-end leading-tight">
        <span className="text-sm font-bold tabular-nums text-orange-600">
          {formatBurned(burned)}
        </span>
        <span className="text-[10px] tabular-nums text-slate-400">
          {pctLabel} burned
        </span>
      </div>
    </div>
  );
}

export default function BurnsFeed() {
  const { burns } = useBurns();
  const { entries, isLoading } = useBuybackHistory();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  const topBurns = burns.slice(0, 5);
  const recent = entries.slice(0, 8);
  const empty = !isLoading && topBurns.length === 0 && recent.length === 0;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="inline-flex items-center gap-1.5 text-sm font-semibold uppercase tracking-widest text-slate-400">
        <Icon name="fire" size={15} className="text-orange-500" />
        Buybacks &amp; Burns
      </h2>

      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
        {topBurns.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Supply burned
            </span>
            {topBurns.map((b) => (
              <BurnBar
                key={b.ticker}
                ticker={b.ticker}
                pct={b.percentBurned}
                currentSupply={b.currentSupply}
              />
            ))}
          </div>
        )}

        {topBurns.length > 0 && recent.length > 0 && (
          <div className="border-t border-slate-100" />
        )}

        {recent.length > 0 && (
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Recent buybacks
            </span>
            {recent.map((b) => {
              const safeHref = safeHttpUrl(b.txUrl);
              const inner = (
                <>
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-50">
                    <Icon name="fire" size={14} className="text-orange-500" />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                      <Flag code={FLAG_BY_TICKER.get(b.teamId) ?? null} className="shrink-0 text-sm" />
                      <span className="truncate">{b.teamName}</span>
                      <span className="font-normal text-slate-400">burned</span>
                      <span className="tabular-nums text-green-600">{b.tokensBurned}</span>
                    </div>
                    <div className="text-xs text-slate-400">
                      {b.matchLabel}
                      <span className="text-slate-300"> · </span>
                      <span suppressHydrationWarning>
                        {now !== null ? formatTimeAgo(b.timestamp, now) : ""}
                      </span>
                    </div>
                  </div>
                  {safeHref && (
                    <Icon name="upRight" size={13} className="shrink-0 text-slate-400" />
                  )}
                </>
              );
              const key = `${b.matchId}-${b.timestamp}`;
              const cls =
                "group flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-slate-50";
              return safeHref ? (
                <a key={key} href={safeHref} target="_blank" rel="noopener noreferrer" className={cls}>
                  {inner}
                </a>
              ) : (
                <div key={key} className={cls}>
                  {inner}
                </div>
              );
            })}
          </div>
        )}

        {empty && (
          <p className="py-1 text-center text-sm text-slate-400">
            Buybacks &amp; burns start after launch, following every match.
          </p>
        )}
      </div>
    </section>
  );
}
