"use client";

import { useState, type ReactNode } from "react";
import type { Match, MarketId } from "@/lib/predict/types";
import { buildMarkets } from "@/lib/predict/markets";
import MarketPicker from "@/components/predict/MarketPicker";
import { MatchHeaderMobile } from "@/components/predict/MatchHeader";

export default function MatchPickScreen({ match, toggle }: { match: Match; toggle?: ReactNode }) {
  const markets = buildMarkets(match);
  const [picks, setPicks] = useState<Partial<Record<MarketId, string>>>({});
  const select = (id: MarketId, optionId: string) =>
    setPicks((p) => ({ ...p, [id]: optionId }));
  const count = Object.keys(picks).length;

  return (
    <div>
      <MatchHeaderMobile match={match} />

      {toggle && <div className="px-4 pt-4">{toggle}</div>}

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
