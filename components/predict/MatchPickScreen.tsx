"use client";

import { useState, type ReactNode } from "react";
import type { Match, MarketId } from "@/lib/predict/types";
import { buildMarkets } from "@/lib/predict/markets";
import { submitPicks } from "@/lib/predict/submitPicks";
import MarketPicker from "@/components/predict/MarketPicker";
import { MatchHeaderMobile } from "@/components/predict/MatchHeader";
import { CheckCircle } from "@phosphor-icons/react/dist/ssr";

export default function MatchPickScreen({ match, toggle }: { match: Match; toggle?: ReactNode }) {
  const markets = buildMarkets(match);
  const [picks, setPicks] = useState<Partial<Record<MarketId, string>>>({});
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const select = (id: MarketId, optionId: string) => {
    setStatus("idle");
    setPicks((p) => ({ ...p, [id]: optionId }));
  };
  const count = Object.keys(picks).length;

  async function lock() {
    if (count === 0 || status === "saving") return;
    setStatus("saving");
    setError(null);
    const res = await submitPicks(match, markets, picks);
    if (res.ok) setStatus("done");
    else {
      setError(res.error);
      setStatus("error");
    }
  }

  const label =
    status === "saving" ? "Locking…" : status === "done" ? "Picks locked" : `Lock my picks · ${count} selected`;

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
          onClick={lock}
          disabled={count === 0 || status === "saving" || status === "done"}
          className={
            "flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-4 text-center text-base font-black tracking-[-0.01em] transition-colors disabled:cursor-not-allowed " +
            (status === "done" ? "bg-green-600 text-white" : "bg-neon text-ink disabled:opacity-50")
          }
        >
          {status === "done" && <CheckCircle weight="fill" size={18} />}
          {label}
        </button>
        <p className="mt-2.5 text-center text-xs font-semibold text-slate-400">
          {status === "error"
            ? error ?? "Couldn't save, try again"
            : status === "done"
            ? "Verified results settle automatically. Track them in Receipts."
            : "Playing as guest · no signup needed"}
        </p>
      </div>
    </div>
  );
}
