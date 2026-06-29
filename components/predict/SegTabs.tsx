"use client";

import { useState } from "react";

// A small segmented control (e.g. This week / All time). Manages its own active
// state so the toggle responds to clicks. `block` makes it full-width (mobile).
export default function SegTabs({ tabs, block = false }: { tabs: string[]; block?: boolean }) {
  const [active, setActive] = useState(0);
  return (
    <div className={(block ? "flex" : "inline-flex") + " gap-1 rounded-xl bg-[#e9eef4] p-1"}>
      {tabs.map((t, i) => (
        <button
          key={t}
          type="button"
          onClick={() => setActive(i)}
          className={
            (block ? "flex-1 " : "") +
            "rounded-[9px] px-5 py-2 text-center text-[13px] transition-colors " +
            (active === i ? "bg-white font-extrabold text-ink shadow-card" : "font-bold text-slate-500")
          }
        >
          {t}
        </button>
      ))}
    </div>
  );
}
