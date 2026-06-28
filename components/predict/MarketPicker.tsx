"use client";

import type { Market } from "@/lib/predict/types";

export default function MarketPicker({
  market, selected, onSelect,
}: {
  market: Market;
  selected: string | null;
  onSelect: (optionId: string) => void;
}) {
  if (market.hero) {
    return (
      <div className="relative overflow-hidden rounded-[18px] bg-ink p-4 shadow-[0_8px_24px_rgba(10,10,10,0.28)]">
        <div
          className="glz-glow pointer-events-none absolute inset-0"
          style={{ background: "linear-gradient(105deg,transparent 25%,rgba(212,255,63,0.14) 50%,transparent 75%)" }}
        />
        <div className="relative">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black tracking-[0.1em] text-neon">⚡ CHAOS PICK</span>
            {market.rewardBadge && (
              <span className="rounded-[7px] bg-neon px-2.5 py-1 text-[11px] font-black text-ink">
                {market.rewardBadge}
              </span>
            )}
          </div>
          {market.question && (
            <div className="mt-2.5 text-[19px] font-black leading-[1.1] tracking-[-0.03em] text-white">
              {market.question}
            </div>
          )}
          {market.subtitle && (
            <div className="mt-1.5 text-xs font-semibold text-slate-500">{market.subtitle}</div>
          )}
          <div className="mt-3 flex gap-2">
            {market.options.map((opt) => {
              const active = selected === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onSelect(opt.id)}
                  className={
                    active
                      ? "glz-pulse flex-1 rounded-xl bg-neon py-3.5 text-center text-[15px] font-black text-ink"
                      : "flex-1 rounded-xl border border-[#2a2a2a] bg-[#171717] py-3.5 text-center text-[15px] font-extrabold text-slate-200"
                  }
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  const hasOdds = market.options.some((o) => o.odds);
  return (
    <div>
      <div className="mb-2 text-[11px] font-black uppercase tracking-[0.12em] text-ink">
        {market.title}
      </div>
      <div className="flex gap-2">
        {market.options.map((opt) => {
          const active = selected === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              aria-pressed={active}
              onClick={() => onSelect(opt.id)}
              className={
                (hasOdds ? "flex-1 rounded-xl px-1.5 py-2.5 text-center " : "flex-1 rounded-xl py-3 text-center ") +
                (active
                  ? "bg-ink text-neon shadow-[0_0_0_3px_rgba(212,255,63,0.35)]"
                  : "border border-[#e2e8f0] bg-white text-ink transition-colors hover:border-slate-300")
              }
            >
              <div className={active ? "text-[13px] font-extrabold" : "text-[13px] font-bold"}>
                {opt.label}{active ? " ✓" : ""}
              </div>
              {opt.odds && (
                <div className="mt-0.5 text-[11px] font-semibold tabular-nums text-slate-400">{opt.odds}</div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
