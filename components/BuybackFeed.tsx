"use client";

import { useEffect, useState } from "react";
import { TEAMS } from "@/constants/teams";
import { useBuybackHistory } from "@/hooks/useBuybackHistory";
import { safeHttpUrl } from "@/lib/url";
import { Flag } from "@/components/Flag";
import { Icon } from "@/components/Icon";

const FLAG_BY_TICKER = new Map(TEAMS.map((t) => [t.ticker, t.flagCode]));

function formatTimeAgo(timestamp: number, now: number): string {
  const seconds = Math.max(0, Math.floor((now - timestamp) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export default function BuybackFeed() {
  const { entries, isLoading } = useBuybackHistory();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  // Nothing to show until the first fetch resolves.
  if (isLoading) return null;

  const recent = entries.slice(0, 10);

  return (
    <section className="flex flex-col gap-3">
      <h2 className="inline-flex items-center gap-1.5 text-sm font-semibold uppercase tracking-widest text-slate-400">
        <Icon name="fire" size={15} className="text-orange-500" />
        Buyback Feed
      </h2>

      {recent.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center text-sm text-slate-400 shadow-card">
          Buybacks start June 11, after every match.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {recent.map((b) => {
            const safeHref = safeHttpUrl(b.txUrl);
            const cardClass =
              "group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-card transition-shadow hover:shadow-card-md";
            const inner = (
              <>
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-50">
                  <Icon name="fire" size={16} className="text-orange-500" />
                </span>

                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                    <Flag
                      code={FLAG_BY_TICKER.get(b.teamId) ?? null}
                      className="shrink-0 text-base"
                    />
                    <span className="truncate">{b.teamName}</span>
                    <span className="font-normal text-slate-400">burned</span>
                    <span className="tabular-nums text-green-600">
                      {b.tokensBurned}
                    </span>
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
                  <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-slate-400 transition-colors group-hover:text-green-600">
                    <span className="hidden sm:inline">View on Solscan</span>
                    <Icon name="upRight" size={13} />
                  </span>
                )}
              </>
            );
            const key = `${b.matchId}-${b.timestamp}`;
            return safeHref ? (
              <a
                key={key}
                href={safeHref}
                target="_blank"
                rel="noopener noreferrer"
                className={cardClass}
              >
                {inner}
              </a>
            ) : (
              <div key={key} className={cardClass}>
                {inner}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
