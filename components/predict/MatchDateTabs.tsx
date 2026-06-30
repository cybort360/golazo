"use client";

import { DATE_TABS, type DateFilter } from "@/lib/predict/matchFilter";

// Interactive Today / Tomorrow / This week pills. `tone` switches between the
// dark ink banner (desktop) and the light page header (mobile).
export default function MatchDateTabs({
  value,
  onChange,
  tone,
}: {
  value: DateFilter;
  onChange: (v: DateFilter) => void;
  tone: "dark" | "light";
}) {
  return (
    <div className="flex shrink-0 gap-2">
      {DATE_TABS.map((t) => {
        const active = t.id === value;
        const cls =
          tone === "dark"
            ? active
              ? "rounded-full bg-neon px-4 py-2 text-[13px] font-extrabold text-ink"
              : "rounded-full border border-[#2a2a2a] bg-[#171717] px-4 py-2 text-[13px] font-bold text-slate-300 transition-colors hover:text-white"
            : active
            ? "rounded-full bg-ink px-3.5 py-1.5 text-xs font-extrabold text-white"
            : "rounded-full bg-[#f1f5f9] px-3.5 py-1.5 text-xs font-bold text-slate-500 transition-colors hover:text-slate-700";
        return (
          <button key={t.id} type="button" onClick={() => onChange(t.id)} aria-pressed={active} className={cls}>
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
