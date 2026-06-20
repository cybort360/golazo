"use client";

import { notFound } from "next/navigation";
import Link from "next/link";
import { TEAMS } from "@/constants/teams";
import { useTokenPrice } from "@/hooks/useTokenPrice";
import { useTokenAddresses } from "@/hooks/useTokenAddresses";
import { useMatchResults } from "@/hooks/useMatchResults";
import { useBurns } from "@/hooks/useBurns";
import { getTeamRecord } from "@/lib/schedule";
import { deriveTeamStatuses } from "@/lib/standings";
import { formatPrice, compactUsd, formatPct } from "@/lib/format";
import { Icon } from "@/components/Icon";
import LazyChart from "@/components/LazyChart";
import TokenLogo from "@/components/TokenLogo";
import CopyAddress from "@/components/CopyAddress";

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-card">
      <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
        {label}
      </div>
      <div className="mt-1 text-lg font-bold tabular-nums text-slate-900">
        {value}
      </div>
    </div>
  );
}

export default function TokenPage({
  params,
}: {
  params: { ticker: string };
}) {
  const ticker = params.ticker.toUpperCase();
  // Case-insensitive lookup: unknown tickers render the 404 page.
  const team = TEAMS.find((t) => t.ticker.toUpperCase() === ticker);

  // Hooks run unconditionally before the notFound() guard so the hook count
  // stays stable across param-change re-renders (React rules of hooks).
  const { priceUsd, priceChange24h, volume24h, marketCap, imageUrl } =
    useTokenPrice(ticker);
  const { teams: liveTeams } = useTokenAddresses();
  const { results, champion } = useMatchResults();

  if (!team) notFound();

  // Only tokenAddress / axiomUrl come from the live (admin-managed) data; all
  // other fields stay on the static constants. The Jupiter trade link is
  // derived straight from the mint, so it needs no admin field.
  const live = liveTeams.find((t) => t.ticker === ticker);
  const tokenAddress = live?.tokenAddress ?? team.tokenAddress;
  const axiomUrl = live?.axiomUrl ?? team.axiomUrl;
  const jupiterUrl = tokenAddress
    ? `https://jup.ag/tokens/${tokenAddress}`
    : null;

  const launched = tokenAddress !== null;
  const record = getTeamRecord(team.ticker, results);
  const status = deriveTeamStatuses(results, champion).get(team.ticker) ?? "active";
  const { byTicker: burnByTicker } = useBurns();
  const burn = burnByTicker[team.ticker];
  const up = priceChange24h !== null && priceChange24h >= 0;

  const statusBadge =
    status === "champion" ? (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-amber-700">
        <Icon name="trophy" size={12} /> Champion
      </span>
    ) : status === "eliminated" ? (
      <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-red-500">
        Eliminated
      </span>
    ) : (
      <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-green-600">
        Active
      </span>
    );

  // Info-only page for the teams we don't list a token for. They're still real
  // World Cup participants — standings, fantasy and predictions all include them
  // — so we show their record and a clear "not listed" note instead of a 404 or
  // a misleading "launching soon" trading page.
  if (!team.listed) {
    return (
      <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8 md:px-8">
        <div className="flex items-center gap-4">
          <TokenLogo imageUrl={null} flagCode={team.flagCode} alt={team.name} />
          <div>
            <h1 className="text-2xl font-semibold uppercase tracking-tight text-slate-900 md:text-4xl">
              {team.name}
            </h1>
            <span className="text-sm text-slate-400">Group {team.group}</span>
          </div>
          <div className="ml-auto">{statusBadge}</div>
        </div>

        <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Icon name="help" size={16} className="text-slate-400" />
            Not listed for trading
          </span>
          <p className="text-sm text-slate-500">
            {team.name} is competing at the World Cup, but doesn&apos;t have a
            tradeable token. You can still follow their results here and pick
            their players in{" "}
            <Link href="/fantasy" className="font-medium text-green-600 hover:underline">
              Fantasy
            </Link>
            .
          </p>
        </div>

        {status === "champion" && (
          <div className="inline-flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm font-semibold text-amber-700">
            <Icon name="trophy" size={16} className="text-amber-500" /> World Cup
            Champion
          </div>
        )}
        {status === "eliminated" && (
          <div className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-600">
            <Icon name="ban" size={16} /> Eliminated from the tournament
          </div>
        )}

        <section className="flex flex-col gap-2">
          <h2 className="label tracking-widest">Tournament Record</h2>
          <div className="grid grid-cols-3 gap-3">
            <StatTile label="Wins" value={`${record.wins}`} />
            <StatTile label="Draws" value={`${record.draws}`} />
            <StatTile label="Losses" value={`${record.losses}`} />
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8 md:px-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <TokenLogo
          imageUrl={imageUrl}
          flagCode={team.flagCode}
          alt={`${team.name} token`}
        />
        <div>
          <h1 className="text-2xl font-semibold uppercase tracking-tight text-slate-900 md:text-4xl">
            {team.name}
          </h1>
          <span className="text-sm text-slate-400">${team.ticker}</span>
        </div>
        <div className="ml-auto flex flex-col items-end gap-1.5">
          <span className="text-[11px] uppercase tracking-wider text-slate-400">
            Group {team.group}
          </span>
          {statusBadge}
        </div>
      </div>

      {/* Contract address (only once the token has launched) */}
      {tokenAddress && (
        <div className="flex flex-col gap-1.5">
          <span className="label">Contract address</span>
          <CopyAddress address={tokenAddress} className="w-full sm:w-fit sm:max-w-full" />
        </div>
      )}

      {/* Champion / eliminated banners */}
      {status === "champion" && (
        <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-card">
          <div className="inline-flex items-center gap-2 text-lg font-bold uppercase tracking-tight text-amber-700">
            <Icon name="trophy" size={20} className="text-amber-500" /> World Cup
            Champion!
          </div>
          <p className="text-sm text-amber-700/80">
            Holders will receive a SOL airdrop after the tournament.
          </p>
          <Link
            href="/prize-pool"
            className="inline-flex w-fit items-center gap-1 rounded-full bg-amber-500 px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition-transform hover:-translate-y-0.5"
          >
            View Prize Pool
            <Icon name="right" size={15} strokeWidth={2.5} />
          </Link>
        </div>
      )}
      {status === "eliminated" && (
        <div className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-600">
          <Icon name="ban" size={16} /> Eliminated from the tournament
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          label="Price"
          value={launched && priceUsd ? formatPrice(priceUsd) : "—"}
        />
        <StatTile
          label="24h Change"
          value={
            launched && priceChange24h !== null ? formatPct(priceChange24h) : "—"
          }
        />
        <StatTile
          label="Volume 24h"
          value={launched && volume24h !== null ? compactUsd(volume24h) : "—"}
        />
        <StatTile
          label="Market Cap"
          value={launched && marketCap !== null ? compactUsd(marketCap) : "—"}
        />
      </div>
      {launched && priceChange24h !== null && (
        <div
          className={`-mt-3 inline-flex items-center gap-1 text-sm font-semibold ${up ? "text-green-600" : "text-red-500"}`}
        >
          <Icon name={up ? "up" : "down"} size={13} strokeWidth={2.5} />
          {formatPct(priceChange24h)} (24h)
        </div>
      )}

      {/* Chart */}
      <section className="flex flex-col gap-2">
        <h2 className="label tracking-widest">Price Chart</h2>
        {launched && tokenAddress ? (
          <LazyChart
            title={`${team.name} price chart`}
            src={`https://dexscreener.com/solana/${tokenAddress}?embed=1&theme=light`}
          />
        ) : (
          <div className="flex h-[400px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white text-sm text-slate-400">
            Chart loading after token launches
          </div>
        )}
      </section>

      {/* Trade: only render links that exist (no empty placeholders) */}
      <section className="flex flex-col gap-2">
        <h2 className="label tracking-widest">Trade</h2>
        {jupiterUrl || axiomUrl ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {jupiterUrl && (
              <a
                href={jupiterUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 rounded-2xl bg-green-600 px-5 py-4 text-base font-semibold text-white shadow-sm transition-transform hover:-translate-y-0.5"
              >
                Trade on Jupiter
                <Icon name="right" size={16} strokeWidth={2.5} />
              </a>
            )}
            {axiomUrl && (
              <a
                href={axiomUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-base font-semibold text-slate-900 shadow-card transition-colors hover:bg-slate-50"
              >
                Trade on Axiom
                <Icon name="right" size={16} strokeWidth={2.5} />
              </a>
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-400">
            Trading links will appear once the token launches.
          </p>
        )}
      </section>

      {/* Record */}
      <section className="flex flex-col gap-2">
        <h2 className="label tracking-widest">Tournament Record</h2>
        <div className="grid grid-cols-3 gap-3">
          <StatTile label="Wins" value={`${record.wins}`} />
          <StatTile label="Losses" value={`${record.losses}`} />
          <StatTile label="Draws" value={`${record.draws}`} />
        </div>
      </section>

      {/* Deflation — only once the token is launched and has on-chain supply */}
      {burn && (
        <section className="flex flex-col gap-2">
          <h2 className="label tracking-widest">Deflation</h2>
          <div className="flex items-center justify-between rounded-xl border border-orange-200 bg-orange-50/50 p-4">
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Icon name="fire" size={16} className="text-orange-500" />
              Supply burned
            </span>
            <span className="text-2xl font-bold tabular-nums text-orange-600">
              {burn.percentBurned.toFixed(2)}%
            </span>
          </div>
        </section>
      )}
    </div>
  );
}
