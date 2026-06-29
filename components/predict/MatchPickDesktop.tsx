"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { Match, MarketId } from "@/lib/predict/types";
import { buildMarkets } from "@/lib/predict/markets";
import MarketPicker from "@/components/predict/MarketPicker";
import { MatchHeaderDesktop } from "@/components/predict/MatchHeader";

function fmtCountdown(ms: number): string {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function MatchPickDesktop({ match, toggle }: { match: Match; toggle?: ReactNode }) {
  const markets = buildMarkets(match);
  const [winner, totals, btts, chaos] = markets;
  const [picks, setPicks] = useState<Partial<Record<MarketId, string>>>({});
  const select = (id: MarketId, optionId: string) =>
    setPicks((p) => ({ ...p, [id]: optionId }));
  const count = Object.keys(picks).length;

  const finished = match.state === "FT" || match.state === "VOID";

  const [remain, setRemain] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setRemain(Math.max(0, match.lockMs - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [match.lockMs]);
  const showLock = !finished && (remain === null || remain > 0);

  const slip = markets
    .filter((m) => picks[m.id])
    .map((m) => ({ id: m.id, title: m.title, label: m.options.find((o) => o.id === picks[m.id])?.label ?? "" }));

  return (
    <div className="hidden lg:block">
      <MatchHeaderDesktop match={match} />

      {toggle && <div className="mx-auto max-w-6xl px-8 pt-6">{toggle}</div>}

      {/* markets + slip */}
      <div className="mx-auto grid max-w-6xl grid-cols-[1fr_340px] items-start gap-7 px-8 py-7">
        <div className="flex flex-col gap-5">
          <MarketPicker market={winner} selected={picks.winner ?? null} onSelect={(o) => select("winner", o)} />
          <div className="grid grid-cols-2 gap-5">
            <MarketPicker market={totals} selected={picks.totals ?? null} onSelect={(o) => select("totals", o)} />
            <MarketPicker market={btts} selected={picks.btts ?? null} onSelect={(o) => select("btts", o)} />
          </div>
          <MarketPicker market={chaos} selected={picks.chaos ?? null} onSelect={(o) => select("chaos", o)} />
        </div>

        {/* slip rail */}
        <aside className="sticky top-6 self-start overflow-hidden rounded-2xl bg-ink text-white">
          <div className="flex items-center justify-between px-5 pt-5">
            <span className="text-[11px] font-black uppercase tracking-[0.13em] text-neon">Your slip</span>
            {showLock && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#171717] px-2.5 py-1 text-[11px] font-bold text-slate-300">
                🔒 <span className="font-black tabular-nums text-neon">{remain === null ? "--:--" : fmtCountdown(remain)}</span>
              </span>
            )}
          </div>

          <div className="px-5 pb-2 pt-3">
            {slip.length === 0 ? (
              <p className="rounded-xl border border-dashed border-[#2a2a2a] px-3 py-4 text-center text-[12px] font-medium text-slate-500">
                Tap a market to add it to your slip.
              </p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {slip.map((s) => (
                  <div key={s.id} className="flex items-center justify-between rounded-xl bg-[#171717] px-3 py-2.5">
                    <span className="text-[11px] font-semibold text-slate-400">{s.title}</span>
                    <span className="text-[13px] font-extrabold text-neon">{s.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="px-5 pb-5 pt-2">
            <button type="button" className="w-full rounded-2xl bg-neon px-4 py-3.5 text-center text-[15px] font-black text-ink">
              Lock my picks · {count} selected
            </button>
            <p className="mt-2.5 text-center text-[11px] font-semibold text-slate-500">Playing as guest · no signup needed</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
