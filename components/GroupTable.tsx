"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Team } from "@/constants/teams";
import { useTokenPrice } from "@/hooks/useTokenPrice";
import type { MatchResult } from "@/hooks/useMatchResults";
import { computeStandings, deriveTeamStatuses } from "@/lib/standings";
import { formatPrice, compactUsd } from "@/lib/format";
import { Flag } from "@/components/Flag";
import { Icon } from "@/components/Icon";
import CopyAddress from "@/components/CopyAddress";

export interface GroupTableProps {
  group: string; // "A" through "L"
  teams: Team[]; // the 4 teams in this group
  results: MatchResult[];
  champion: string | null;
  // Optional controlled mode (used by the homepage's Expand/Collapse All).
  open?: boolean;
  onToggle?: () => void;
}

function cx(...c: Array<string | false | null | undefined>): string {
  return c.filter(Boolean).join(" ");
}

function Skel() {
  return (
    <span className="inline-block h-3.5 w-12 animate-pulse rounded bg-slate-200 align-middle" />
  );
}

// ── A single standings row (fetches its own price) ────────────────────────────

function GroupRow({
  team,
  rank,
  status,
  reportMcap,
}: {
  team: Team;
  rank: number;
  status: "active" | "eliminated" | "champion";
  reportMcap: (ticker: string, mcap: number | null) => void;
}) {
  const router = useRouter();
  const { priceUsd, priceChange24h, volume24h, marketCap, isLoading } =
    useTokenPrice(team.ticker);

  useEffect(() => {
    reportMcap(team.ticker, marketCap);
  }, [team.ticker, marketCap, reportMcap]);

  const listed = team.listed;
  const launched = team.tokenAddress !== null;
  // Buy link is derived from the mint (Jupiter); no separate URL field needed.
  const jupiterUrl = team.tokenAddress
    ? `https://jup.ag/tokens/${team.tokenAddress}`
    : null;
  const elim = status === "eliminated";
  const champ = status === "champion";
  const up = priceChange24h !== null && priceChange24h >= 0;
  const loadingCell = launched && isLoading && !priceUsd;

  const dataCell = (content: ReactNode): ReactNode => {
    if (!launched) return <span className="text-slate-300">—</span>;
    if (loadingCell) return <Skel />;
    return content;
  };

  return (
    <tr
      className={cx(
        "border-b border-slate-100 transition-colors",
        elim ? "opacity-50" : "hover:bg-slate-50",
        champ && "bg-amber-50 hover:bg-amber-50",
      )}
    >
      <td className="px-3 py-2.5 text-center text-xs tabular-nums text-slate-400">
        {rank}
      </td>
      <td className="px-3 py-2.5">
        <button
          type="button"
          onClick={() => router.push(`/token/${team.ticker}`)}
          className="group flex items-center gap-2.5 text-left"
        >
          <Flag code={team.flagCode} className="shrink-0 text-base" />
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="inline-flex items-center gap-1.5">
              <span
                className={cx(
                  "truncate font-semibold tracking-tight group-hover:text-green-600",
                  elim ? "text-slate-400 line-through" : "text-slate-900",
                )}
              >
                {team.name}
              </span>
              {champ && (
                <Icon name="trophy" size={14} className="text-amber-500" />
              )}
              {elim && (
                <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-red-600">
                  Elim
                </span>
              )}
            </span>
            <span className="truncate text-[11px] text-slate-400">
              {listed ? `$${team.ticker}` : "Not listed"}
            </span>
          </span>
        </button>
        {team.tokenAddress && (
          <div className="mt-1.5 max-w-[260px]">
            <CopyAddress address={team.tokenAddress} />
          </div>
        )}
      </td>
      <td className="px-3 py-2.5 text-right font-medium tabular-nums text-slate-900">
        {dataCell(priceUsd ? formatPrice(priceUsd) : "—")}
      </td>
      <td className="px-3 py-2.5 text-right tabular-nums">
        {dataCell(
          priceChange24h !== null ? (
            <span
              className={cx(
                "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold",
                up
                  ? "bg-green-50 text-green-600"
                  : "bg-red-50 text-red-500",
              )}
            >
              <Icon name={up ? "up" : "down"} size={11} strokeWidth={2.5} />
              {Math.abs(priceChange24h).toFixed(1)}%
            </span>
          ) : (
            <span className="text-slate-300">—</span>
          ),
        )}
      </td>
      <td className="px-3 py-2.5 text-right tabular-nums text-slate-500">
        {dataCell(volume24h !== null ? compactUsd(volume24h) : "—")}
      </td>
      <td className="px-3 py-2.5 text-right tabular-nums text-slate-500">
        {dataCell(marketCap !== null ? compactUsd(marketCap) : "—")}
      </td>
      <td className="px-3 py-2.5 text-center">
        {!listed ? (
          <span className="text-xs font-medium text-slate-300">Not listed</span>
        ) : (
          <div className="inline-flex flex-col items-center gap-1">
            {jupiterUrl ? (
              <a
                href={jupiterUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center whitespace-nowrap rounded-full border border-green-600 px-3 py-1 text-xs font-semibold text-green-600 transition-colors hover:bg-green-50"
              >
                Buy ${team.ticker}
              </a>
            ) : (
              <span className="inline-flex cursor-not-allowed items-center whitespace-nowrap rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-300">
                Buy ${team.ticker}
              </span>
            )}
            {team.axiomUrl && (
              <a
                href={team.axiomUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center whitespace-nowrap rounded-full border border-slate-200 px-3 py-0.5 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-slate-50"
              >
                Axiom
              </a>
            )}
          </div>
        )}
      </td>
      <td className="px-3 py-2.5 text-center">
        <Link
          href={`/token/${team.ticker}`}
          aria-label={`Open ${team.name} page`}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-green-600"
        >
          <Icon name="right" size={16} />
        </Link>
      </td>
    </tr>
  );
}

// ── A single standings card (mobile) ──────────────────────────────────────────

function GroupRowMobile({
  team,
  rank,
  status,
  reportMcap,
}: {
  team: Team;
  rank: number;
  status: "active" | "eliminated" | "champion";
  reportMcap: (ticker: string, mcap: number | null) => void;
}) {
  const router = useRouter();
  const { priceUsd, priceChange24h, marketCap, isLoading } = useTokenPrice(
    team.ticker,
  );

  useEffect(() => {
    reportMcap(team.ticker, marketCap);
  }, [team.ticker, marketCap, reportMcap]);

  const listed = team.listed;
  const launched = team.tokenAddress !== null;
  // Buy link is derived from the mint (Jupiter); no separate URL field needed.
  const jupiterUrl = team.tokenAddress
    ? `https://jup.ag/tokens/${team.tokenAddress}`
    : null;
  const elim = status === "eliminated";
  const champ = status === "champion";
  const up = priceChange24h !== null && priceChange24h >= 0;
  const loading = launched && isLoading && !priceUsd;

  return (
    <div
      className={cx(
        "flex flex-col gap-2.5 border-b border-slate-100 p-3 last:border-b-0",
        elim && "opacity-50",
        champ && "bg-amber-50",
      )}
    >
      <div className="flex items-center gap-2.5">
        <span className="w-4 shrink-0 text-xs tabular-nums text-slate-400">
          {rank}
        </span>
        <Flag code={team.flagCode} className="shrink-0 text-base" />
        <button
          type="button"
          onClick={() => router.push(`/token/${team.ticker}`)}
          className="flex min-w-0 flex-1 flex-col text-left leading-tight"
        >
          <span className="inline-flex items-center gap-1.5">
            <span
              className={cx(
                "truncate font-semibold tracking-tight",
                elim ? "text-slate-400 line-through" : "text-slate-900",
              )}
            >
              {team.name}
            </span>
            {champ && <Icon name="trophy" size={14} className="text-amber-500" />}
            {elim && (
              <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-red-600">
                Elim
              </span>
            )}
          </span>
          <span className="truncate text-[11px] text-slate-400">
            {listed ? `$${team.ticker}` : "Not listed"}
          </span>
        </button>
        <div className="flex shrink-0 flex-col items-end">
          <span className="text-sm font-medium tabular-nums text-slate-900">
            {!launched ? (
              <span className="text-slate-300">—</span>
            ) : loading ? (
              <Skel />
            ) : priceUsd ? (
              formatPrice(priceUsd)
            ) : (
              "—"
            )}
          </span>
          {launched && priceChange24h !== null && (
            <span
              className={cx(
                "text-xs font-semibold tabular-nums",
                up ? "text-green-600" : "text-red-500",
              )}
            >
              {up ? "+" : ""}
              {priceChange24h.toFixed(1)}%
            </span>
          )}
        </div>
      </div>

      {team.tokenAddress && (
        <CopyAddress address={team.tokenAddress} className="w-full" />
      )}

      {!listed ? (
        <span className="text-xs font-medium text-slate-300">Not listed</span>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {jupiterUrl ? (
            <a
              href={jupiterUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center whitespace-nowrap rounded-full border border-green-600 px-3 py-1 text-xs font-semibold text-green-600 transition-colors hover:bg-green-50"
            >
              Buy ${team.ticker}
            </a>
          ) : (
            <span className="inline-flex cursor-not-allowed items-center whitespace-nowrap rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-300">
              Buy ${team.ticker}
            </span>
          )}
          {team.axiomUrl && (
            <a
              href={team.axiomUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center whitespace-nowrap rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
            >
              Trade on Axiom
            </a>
          )}
        </div>
      )}
    </div>
  );
}

// ── Group table ───────────────────────────────────────────────────────────────

export default function GroupTable({
  group,
  teams,
  results,
  champion,
  open: openProp,
  onToggle,
}: GroupTableProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const toggle = () =>
    onToggle ? onToggle() : setInternalOpen((o) => !o);

  const statuses = useMemo(
    () => deriveTeamStatuses(results, champion),
    [results, champion],
  );
  const standings = useMemo(() => computeStandings(results), [results]);
  const started = standings.groupStarted.get(group) ?? false;

  const [mcaps, setMcaps] = useState<Record<string, number | null>>({});
  const reportMcap = useCallback((ticker: string, mcap: number | null) => {
    setMcaps((prev) => (prev[ticker] === mcap ? prev : { ...prev, [ticker]: mcap }));
  }, []);

  // Order: by points once the group has results, else by market cap desc.
  const ordered = useMemo<Team[]>(() => {
    if (started) {
      return (standings.byGroup.get(group) ?? []).map((s) => s.team);
    }
    return [...teams].sort(
      (a, b) => (mcaps[b.ticker] ?? -1) - (mcaps[a.ticker] ?? -1),
    );
  }, [started, standings, group, teams, mcaps]);

  return (
    <div
      className={cx(
        "overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card transition-shadow",
        !open && "hover:shadow-card-md",
      )}
    >
      {/* Collapsed header row */}
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-slate-50"
      >
        <span className="shrink-0 text-xs font-bold uppercase tracking-wider text-green-600">
          Group {group}
        </span>
        <div className="grid flex-1 grid-cols-4 gap-2">
          {ordered.map((t) => (
            <span
              key={t.ticker}
              title={t.name}
              className="inline-flex min-w-0 max-w-full items-center gap-1.5 justify-self-start rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600"
            >
              <Flag code={t.flagCode} className="shrink-0 text-sm" />
              <span className="hidden min-w-0 truncate sm:inline">{t.name}</span>
            </span>
          ))}
        </div>
        <Icon
          name="down"
          size={16}
          className={cx(
            "shrink-0 text-slate-400 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {/* Expanded: cards on mobile, table on desktop */}
      {open && (
        <div className="border-t border-slate-100">
          <div className="md:hidden">
            {ordered.map((team, i) => (
              <GroupRowMobile
                key={team.ticker}
                team={team}
                rank={i + 1}
                status={statuses.get(team.ticker) ?? "active"}
                reportMcap={reportMcap}
              />
            ))}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wider text-slate-400">
                  <th className="px-3 py-2.5 text-center font-medium">#</th>
                  <th className="px-3 py-2.5 text-left font-medium">Team</th>
                  <th className="px-3 py-2.5 text-right font-medium">Price</th>
                  <th className="px-3 py-2.5 text-right font-medium">24h %</th>
                  <th className="px-3 py-2.5 text-right font-medium">Vol</th>
                  <th className="px-3 py-2.5 text-right font-medium">MCap</th>
                  <th className="px-3 py-2.5 text-center font-medium">Buy</th>
                  <th
                    className="px-3 py-2.5 text-center font-medium"
                    aria-label="Open"
                  />
                </tr>
              </thead>
              <tbody>
                {ordered.map((team, i) => (
                  <GroupRow
                    key={team.ticker}
                    team={team}
                    rank={i + 1}
                    status={statuses.get(team.ticker) ?? "active"}
                    reportMcap={reportMcap}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            onClick={toggle}
            className="flex w-full items-center justify-center gap-1 border-t border-slate-100 py-2.5 text-xs font-semibold text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600"
          >
            <Icon name="up" size={12} strokeWidth={2.5} />
            Collapse
          </button>
        </div>
      )}
    </div>
  );
}
