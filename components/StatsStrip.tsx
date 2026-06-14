"use client";

// Social-proof strip: total 24h token trading volume + recent prize payouts
// (with Solscan links). Reads /api/stats. Renders nothing until there's real
// data, so it never shows an empty "0 / no winners" state.

import { useEffect, useState } from "react";
import { Flag } from "@/components/Flag";
import { TEAMS } from "@/constants/teams";

const TEAM = new Map(TEAMS.map((t) => [t.ticker, t]));

interface Payout {
  week: number;
  team: string | null;
  sol: number;
  tx: string;
}
interface Stats {
  totalVolume24h: number;
  recentPayouts: Payout[];
  biggestPayouts: Payout[];
}

function compactUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${Math.round(n)}`;
}

function PayoutRow({ p }: { p: Payout }) {
  const team = p.team ? TEAM.get(p.team) : undefined;
  return (
    <a
      href={`https://solscan.io/tx/${p.tx}`}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-slate-50"
    >
      <span className="flex items-center gap-2">
        {team ? <Flag code={team.flagCode} className="text-sm" /> : null}
        <span className="font-medium text-slate-800">{team?.name ?? p.team ?? "—"}</span>
        <span className="text-xs text-slate-400">Week {p.week}</span>
      </span>
      <span className="font-bold tabular-nums text-green-600">{p.sol} SOL</span>
    </a>
  );
}

export default function StatsStrip() {
  const [stats, setStats] = useState<Stats | null>(null);
  useEffect(() => {
    fetch("/api/stats", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Stats | null) => d && setStats(d))
      .catch(() => {});
  }, []);

  if (!stats) return null;
  const hasPayouts = stats.recentPayouts.length > 0;
  if (stats.totalVolume24h <= 0 && !hasPayouts) return null;

  const biggest = stats.biggestPayouts[0];

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
      <div className="flex flex-wrap gap-6">
        {stats.totalVolume24h > 0 && (
          <div>
            <div className="text-2xl font-bold tabular-nums text-slate-900">
              {compactUsd(stats.totalVolume24h)}
            </div>
            <div className="text-xs uppercase tracking-wider text-slate-400">24h token volume</div>
          </div>
        )}
        {biggest && (
          <div>
            <div className="text-2xl font-bold tabular-nums text-green-600">{biggest.sol} SOL</div>
            <div className="text-xs uppercase tracking-wider text-slate-400">biggest payout</div>
          </div>
        )}
      </div>

      {hasPayouts && (
        <div className="flex flex-col gap-1">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Recent payouts
          </h3>
          <div className="flex flex-col divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-100">
            {stats.recentPayouts.map((p) => (
              <PayoutRow key={`${p.week}-${p.tx}`} p={p} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
