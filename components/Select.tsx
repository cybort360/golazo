"use client";

// Lightweight styled dropdown for simple value lists (formation, gameweek, …),
// matching the look of TeamSelect without the search/flags. Closes on
// outside-click; the trigger shows the selected label.

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";

export interface SelectOption {
  value: string;
  label: string;
}

export default function Select({
  value,
  options,
  onChange,
  className = "",
  placeholder = "Select…",
}: {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none transition-colors hover:border-slate-400 focus:border-green-500 focus:ring-2 focus:ring-green-500/30"
      >
        <span className="truncate">{selected?.label ?? placeholder}</span>
        <Icon
          name="down"
          size={16}
          className={`shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 z-30 mt-1.5 min-w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card-md">
          <ul role="listbox" className="max-h-64 overflow-auto p-1">
            {options.map((o) => {
              const isSel = o.value === value;
              return (
                <li
                  key={o.value}
                  role="option"
                  aria-selected={isSel}
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  className={`flex cursor-pointer items-center justify-between gap-3 whitespace-nowrap rounded-lg px-3 py-2 text-sm transition-colors hover:bg-green-50 ${
                    isSel ? "font-semibold text-slate-900" : "text-slate-700"
                  }`}
                >
                  <span>{o.label}</span>
                  {isSel && <Icon name="check" size={15} className="text-green-600" />}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
