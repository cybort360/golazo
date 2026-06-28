"use client";

import { useEffect, useState } from "react";
import type { Match, MarketId } from "@/lib/predict/types";
import { buildMarkets } from "@/lib/predict/markets";
import { scoreLabel, matchStateLabel } from "@/lib/predict/labels";
import MarketPicker from "@/components/predict/MarketPicker";
import TeamAvatar from "@/components/predict/TeamAvatar";

function fmtCountdown(ms: number): string {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function MatchPickScreen({ match }: { match: Match }) {
  const markets = buildMarkets(match);
  const [picks, setPicks] = useState<Partial<Record<MarketId, string>>>({});
  const select = (id: MarketId, optionId: string) =>
    setPicks((p) => ({ ...p, [id]: optionId }));
  const count = Object.keys(picks).length;

  const liveLabel = matchStateLabel(match);
  const finished = match.state === "FT" || match.state === "VOID";

  // Client-only lock countdown (avoids SSR/CSR mismatch on the live clock).
  const [remain, setRemain] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setRemain(Math.max(0, match.lockMs - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [match.lockMs]);
  const showLock = !finished && (remain === null || remain > 0);

  return (
    <div>
      {/* ink header — full bleed to the top + edges */}
      <div className="bg-ink px-5 pb-5 pt-5 text-white">
        <div className="flex items-center justify-between text-[13px] font-bold text-slate-400">
          <span>‹ Back</span>
          {liveLabel && (
            <span className="inline-flex items-center gap-1.5 text-white">
              <span className="glz-blink h-1.5 w-1.5 rounded-full bg-neon" />
              {liveLabel}
            </span>
          )}
          <span>⋯</span>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <div className="w-[92px] text-center">
            <TeamAvatar team={match.home} size={46} />
            <div className="mt-1.5 text-[13px] font-bold">{match.home.name}</div>
          </div>
          <div className="text-center">
            <div className="text-[34px] font-black tracking-[-0.04em]">{scoreLabel(match) || "vs"}</div>
            {match.phaseLabel && <div className="text-[11px] font-semibold text-slate-500">{match.phaseLabel}</div>}
          </div>
          <div className="w-[92px] text-center">
            <TeamAvatar team={match.away} size={46} />
            <div className="mt-1.5 text-[13px] font-bold">{match.away.name}</div>
          </div>
        </div>
        {showLock && (
          <div className="mt-4 flex items-center justify-between rounded-xl border border-[#262626] bg-[#171717] px-3.5 py-2.5">
            <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">Picks lock in</span>
            <span className="text-[17px] font-black tabular-nums text-neon">
              {remain === null ? "--:--" : fmtCountdown(remain)}
            </span>
          </div>
        )}
      </div>

      {/* markets */}
      <div className="flex flex-col gap-3.5 px-4 pb-4 pt-4">
        {markets.map((m) => (
          <MarketPicker
            key={m.id}
            market={m}
            selected={picks[m.id] ?? null}
            onSelect={(opt) => select(m.id, opt)}
          />
        ))}
      </div>

      {/* lock cta */}
      <div className="px-4 pb-6 pt-1">
        <button
          type="button"
          className="w-full rounded-2xl bg-neon px-4 py-4 text-center text-base font-black tracking-[-0.01em] text-ink"
        >
          Lock my picks · {count} selected
        </button>
        <p className="mt-2.5 text-center text-xs font-semibold text-slate-400">
          Playing as guest · no signup needed
        </p>
      </div>
    </div>
  );
}
