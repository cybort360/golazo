"use client";

import { useEffect, useState } from "react";
import type { Match } from "@/lib/predict/types";
import type { TxlineOdds } from "@/lib/txline/client";

// Market consensus: TxLINE's demargined implied probabilities for the match,
// shown as a 1X2 bar + an over/under read. Surfaces a TxLINE data dimension
// beyond scores. Renders nothing when no odds are posted.
function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

export default function MarketConsensus({ match }: { match: Match }) {
  const [odds, setOdds] = useState<TxlineOdds | null | undefined>(undefined);

  useEffect(() => {
    let live = true;
    const run = () =>
      fetch(`/api/predict/odds/${match.id}`)
        .then((r) => r.json())
        .then((d) => live && setOdds(d.odds ?? null))
        .catch(() => live && setOdds(null));
    void run();
    const t = setInterval(run, 30000);
    return () => {
      live = false;
      clearInterval(t);
    };
  }, [match.id]);

  if (!odds || (!odds.winner && !odds.totals)) return null;

  const w = odds.winner;
  const segs = w
    ? [
        { key: "home", label: match.home.ticker, v: w.home, bar: "bg-neon" },
        { key: "draw", label: "DRAW", v: w.draw, bar: "bg-[#334155]" },
        { key: "away", label: match.away.ticker, v: w.away, bar: "bg-[#94a3b8]" },
      ]
    : [];

  return (
    <div className="rounded-2xl border border-[#e2e8f0] bg-white p-4 shadow-card">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-black uppercase tracking-[0.12em] text-ink">Market consensus</span>
        <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">via TxLINE</span>
      </div>

      {w && (
        <>
          <div className="mt-3 flex h-2.5 overflow-hidden rounded-full">
            {segs.map((s) => (
              <div key={s.key} className={s.bar} style={{ width: `${Math.max(s.v * 100, 2)}%` }} />
            ))}
          </div>
          <div className="mt-2 flex justify-between">
            {segs.map((s) => (
              <div key={s.key} className="text-center">
                <div className="text-[13px] font-black tabular-nums text-ink">{pct(s.v)}</div>
                <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{s.label}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {odds.totals && (
        <div className="mt-3 flex items-center justify-between border-t border-[#f1f5f9] pt-3 text-[12px] font-semibold text-slate-500">
          <span>Over {odds.totals.line} goals</span>
          <span className="tabular-nums text-ink">
            <span className="font-black">{pct(odds.totals.over)}</span> over · {pct(odds.totals.under)} under
          </span>
        </div>
      )}
    </div>
  );
}
