"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import TournamentBracket from "@/components/TournamentBracket";
import ChampionPrediction from "@/components/ChampionPrediction";
import { usePrizePool } from "@/hooks/usePrizePool";
import { useMatchResults } from "@/hooks/useMatchResults";
import { useTokenAddresses } from "@/hooks/useTokenAddresses";
import { TEAMS, type Team } from "@/constants/teams";
import { getTeamRecord } from "@/lib/schedule";
import { deriveTeamStatuses, type TeamStatus } from "@/lib/standings";
import { getMultipleTokenPrices, type TokenPrice } from "@/lib/dexscreener";
import { formatPrice, formatPct, formatUsd } from "@/lib/format";
import { Flag } from "@/components/Flag";
import { Icon } from "@/components/Icon";

function cx(...c: Array<string | false | null | undefined>): string {
  return c.filter(Boolean).join(" ");
}

function StatusPill({ status }: { status: TeamStatus }) {
  if (status === "champion")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-amber-700">
        <Icon name="trophy" size={12} /> Champion
      </span>
    );
  if (status === "eliminated")
    return (
      <span className="inline-flex rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-red-500">
        Out
      </span>
    );
  return (
    <span className="inline-flex rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-green-600">
      Active
    </span>
  );
}

function PrizeBanner() {
  const { balanceSOL, balanceUSD } = usePrizePool();
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-green-200 bg-green-50 px-5 py-4 shadow-card">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm">
          <Icon name="trophy" size={20} className="text-amber-500" />
        </span>
        <div>
          <div className="label">Prize Pool</div>
          <div className="text-xl font-bold tabular-nums text-slate-900">
            {balanceSOL !== null ? `${balanceSOL.toFixed(1)} SOL` : "—"}
            {balanceUSD !== null && (
              <span className="ml-2 text-sm font-normal text-slate-400">
                ≈ {formatUsd(balanceUSD)}
              </span>
            )}
          </div>
        </div>
      </div>
      <Link
        href="/prize-pool"
        className="inline-flex items-center gap-1 text-sm font-medium text-green-600 transition-colors hover:text-green-700"
      >
        How it works
        <Icon name="right" size={13} />
      </Link>
    </div>
  );
}

interface Row {
  team: Team;
  wins: number;
  losses: number;
  draws: number;
  status: TeamStatus;
}

export default function LeaderboardPage() {
  const { results, champion } = useMatchResults();
  const { teams: liveTeams } = useTokenAddresses();
  const [prices, setPrices] = useState<Map<string, TokenPrice>>(new Map());

  const statuses = useMemo(
    () => deriveTeamStatuses(results, champion),
    [results, champion],
  );

  const rows = useMemo<Row[]>(() => {
    return TEAMS.map((team) => {
      const rec = getTeamRecord(team.ticker, results);
      return {
        team,
        wins: rec.wins,
        losses: rec.losses,
        draws: rec.draws,
        status: statuses.get(team.ticker) ?? "active",
      };
    }).sort(
      (a, b) =>
        b.wins - a.wins ||
        b.draws - a.draws ||
        a.losses - b.losses ||
        a.team.name.localeCompare(b.team.name),
    );
  }, [results, statuses]);

  // Prices for launched tokens, keyed by ticker (addresses merged from admin).
  useEffect(() => {
    const launched = liveTeams.filter((t) => t.tokenAddress !== null);
    if (launched.length === 0) return;
    let cancelled = false;
    const load = async () => {
      const addresses = launched
        .map((t) => t.tokenAddress)
        .filter((a): a is string => a !== null);
      const byAddress = await getMultipleTokenPrices(addresses);
      if (cancelled) return;
      const byTicker = new Map<string, TokenPrice>();
      for (const t of launched) {
        const p = t.tokenAddress ? byAddress.get(t.tokenAddress) : undefined;
        if (p) byTicker.set(t.ticker, p);
      }
      setPrices(byTicker);
    };
    void load();
    const id = setInterval(() => void load(), 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [liveTeams]);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 md:px-8">
      <PrizeBanner />

      <ChampionPrediction champion={champion} />

      <h1 className="text-2xl font-semibold uppercase tracking-tight text-slate-900 md:text-3xl">
        Standings
      </h1>

      {/* Standings: stacked cards on mobile, table on desktop */}
      <div className="flex flex-col gap-2 md:hidden">
        {rows.map((row, i) => {
          const price = prices.get(row.team.ticker);
          const champ = row.status === "champion";
          const out = row.status === "eliminated";
          const up = price ? price.priceChange24h >= 0 : false;
          return (
            <Link
              key={row.team.ticker}
              href={`/token/${row.team.ticker}`}
              className={cx(
                "flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-card",
                champ && "bg-amber-50",
                out && "opacity-50",
              )}
            >
              <div className="flex items-center gap-2.5">
                <span className="w-4 shrink-0 text-xs tabular-nums text-slate-400">
                  {i + 1}
                </span>
                <Flag code={row.team.flagCode} className="shrink-0 text-base" />
                <span className="flex min-w-0 flex-col leading-tight">
                  <span
                    className={cx(
                      "truncate font-semibold tracking-tight",
                      out ? "text-slate-400 line-through" : "text-slate-900",
                    )}
                  >
                    {row.team.name}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    ${row.team.ticker}
                  </span>
                </span>
                <span className="ml-auto shrink-0">
                  <StatusPill status={row.status} />
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-2 text-xs">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400">
                    Record
                  </span>
                  <span className="tabular-nums text-slate-600">
                    {row.wins}-{row.draws}-{row.losses}
                  </span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400">
                    Price
                  </span>
                  <span className="font-medium tabular-nums text-slate-900">
                    {price ? formatPrice(price.priceUsd) : "—"}
                  </span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400">
                    24h
                  </span>
                  <span
                    className={cx(
                      "font-medium tabular-nums",
                      price
                        ? up
                          ? "text-green-600"
                          : "text-red-500"
                        : "text-slate-300",
                    )}
                  >
                    {price ? formatPct(price.priceChange24h) : "—"}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-card md:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wider text-slate-400">
              <th className="px-4 py-3 font-medium">#</th>
              <th className="px-4 py-3 font-medium">Team</th>
              <th className="px-4 py-3 text-center font-medium">W-D-L</th>
              <th className="px-4 py-3 text-right font-medium">Price</th>
              <th className="px-4 py-3 text-right font-medium">24h</th>
              <th className="px-4 py-3 text-right font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const price = prices.get(row.team.ticker);
              const champ = row.status === "champion";
              const out = row.status === "eliminated";
              const up = price ? price.priceChange24h >= 0 : false;
              return (
                <tr
                  key={row.team.ticker}
                  className={cx(
                    "border-b border-slate-100 transition-colors last:border-b-0",
                    champ ? "bg-amber-50 hover:bg-amber-50" : "hover:bg-slate-50",
                    out && "opacity-50",
                  )}
                >
                  <td className="px-4 py-3 text-xs tabular-nums text-slate-400">
                    {i + 1}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/token/${row.team.ticker}`}
                      className="group flex items-center gap-2"
                    >
                      <Flag code={row.team.flagCode} className="text-base" />
                      <span
                        className={cx(
                          "font-semibold tracking-tight group-hover:text-green-600",
                          out ? "text-slate-400 line-through" : "text-slate-900",
                        )}
                      >
                        {row.team.name}
                      </span>
                      <span className="text-xs text-slate-400">
                        ${row.team.ticker}
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-center tabular-nums text-slate-500">
                    {row.wins}-{row.draws}-{row.losses}
                  </td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums text-slate-900">
                    {price ? formatPrice(price.priceUsd) : "—"}
                  </td>
                  <td
                    className={cx(
                      "px-4 py-3 text-right font-medium tabular-nums",
                      price
                        ? up
                          ? "text-green-600"
                          : "text-red-500"
                        : "text-slate-300",
                    )}
                  >
                    {price ? formatPct(price.priceChange24h) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <StatusPill status={row.status} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Bracket (collapsible) */}
      <details className="group rounded-2xl border border-slate-200 bg-white shadow-card">
        <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-sm font-bold uppercase tracking-wider text-slate-500 transition-colors hover:text-slate-700 [&::-webkit-details-marker]:hidden">
          <span className="inline-flex items-center gap-1.5 group-open:hidden">
            View Full Bracket
            <Icon name="down" size={15} />
          </span>
          <span className="hidden items-center gap-1.5 group-open:inline-flex">
            Hide Bracket
            <Icon name="up" size={15} />
          </span>
        </summary>
        <div className="border-t border-slate-100 p-4 md:p-5">
          <TournamentBracket results={results} champion={champion} />
        </div>
      </details>
    </div>
  );
}
