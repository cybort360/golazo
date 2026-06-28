"use client";

import type { Market } from "@/lib/predict/types";

export default function MarketPicker({
  market, selected, onSelect,
}: {
  market: Market;
  selected: string | null;
  onSelect: (optionId: string) => void;
}) {
  const hero = market.hero;
  return (
    <div className={hero ? "rounded-2xl bg-ink p-3" : ""}>
      <div className={`mb-1.5 text-[10px] font-black uppercase tracking-widest ${hero ? "text-neon" : "text-slate-500"}`}>
        {hero && <span>⚡ </span>}{market.title}
      </div>
      {market.question && (
        <div className="mb-2 text-sm font-extrabold text-white">{market.question}</div>
      )}
      <div className="flex gap-1.5">
        {market.options.map((opt) => {
          const active = selected === opt.id;
          const base = "flex-1 rounded-xl px-3 py-2.5 text-center text-xs font-extrabold transition-colors";
          const cls = active
            ? "bg-neon text-ink"
            : hero
              ? "bg-[#1f1f1f] text-neutral-300"
              : "border border-[#e2e8f0] bg-white text-slate-600 hover:border-slate-300";
          return (
            <button
              key={opt.id}
              type="button"
              aria-pressed={active}
              onClick={() => onSelect(opt.id)}
              className={`${base} ${cls}`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
