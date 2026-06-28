"use client";

import { useState } from "react";
import type { Match, MarketId } from "@/lib/predict/types";
import { buildMarkets } from "@/lib/predict/markets";
import { scoreLabel, matchStateLabel } from "@/lib/predict/labels";
import MarketPicker from "@/components/predict/MarketPicker";

export default function MatchPickScreen({ match }: { match: Match }) {
  const markets = buildMarkets(match);
  const [picks, setPicks] = useState<Partial<Record<MarketId, string>>>({});
  const select = (id: MarketId, optionId: string) =>
    setPicks((p) => ({ ...p, [id]: optionId }));

  const count = Object.keys(picks).length;
  const liveLabel = matchStateLabel(match);

  return (
    <div className="mx-auto max-w-md overflow-hidden rounded-3xl border border-[#e2e8f0] bg-[#f8fafc] shadow-card-md">
      <div className="bg-ink px-5 py-4 text-white">
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest">
          <span className="text-neutral-400">{match.competition} · {match.round}</span>
          {liveLabel && <span className="text-neon">● {liveLabel}</span>}
        </div>
        <div className="mt-2.5 flex items-center justify-center gap-5">
          <div className="text-center"><div className="text-base font-black">{match.home.ticker}</div></div>
          <div className="text-2xl font-black tracking-tight">{scoreLabel(match) || "vs"}</div>
          <div className="text-center"><div className="text-base font-black">{match.away.ticker}</div></div>
        </div>
      </div>

      <div className="flex flex-col gap-3 px-4 pb-5 pt-4">
        {markets.map((m) => (
          <MarketPicker
            key={m.id}
            market={m}
            selected={picks[m.id] ?? null}
            onSelect={(opt) => select(m.id, opt)}
          />
        ))}

        <button
          type="button"
          className="mt-1 rounded-2xl bg-green-600 px-4 py-3.5 text-center text-sm font-black text-white"
        >
          Lock my {count} pick{count === 1 ? "" : "s"} ▸
        </button>
        <p className="text-center text-xs text-slate-400">
          Playing as guest · no signup needed —{" "}
          <span className="font-bold text-green-600">save your streak</span>
        </p>
      </div>
    </div>
  );
}
