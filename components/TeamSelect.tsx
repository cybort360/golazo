"use client";

import { useEffect, useRef, useState } from "react";
import type { Team } from "@/constants/teams";
import { Flag } from "@/components/Flag";
import { Icon } from "@/components/Icon";

function cx(...c: Array<string | false | null | undefined>): string {
  return c.filter(Boolean).join(" ");
}

// Fully styled, accessible team picker. Native <select> can't show flags or be
// themed consistently across browsers, so this renders a custom popover with a
// search box, flag chips, keyboard navigation and outside-click handling.
export default function TeamSelect({
  teams,
  value,
  onChange,
  placeholder = "Select a team…",
}: {
  teams: Team[];
  value: string;
  onChange: (ticker: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = teams.find((t) => t.ticker === value);
  const q = query.trim().toLowerCase();
  const filtered = q
    ? teams.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.ticker.toLowerCase().includes(q),
      )
    : teams;

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  // Reset + focus the search box when opening.
  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActive(0);
    const id = requestAnimationFrame(() => searchRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);

  // Keep highlight in range as the list filters.
  useEffect(() => setActive(0), [query]);

  // Keep the highlighted row visible.
  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.children[active] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const choose = (ticker: string) => {
    onChange(ticker);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const t = filtered[active];
      if (t) choose(t.ticker);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition-colors hover:border-slate-400 focus:border-green-500 focus:ring-2 focus:ring-green-500/30"
      >
        <span className="flex min-w-0 items-center gap-2">
          {selected ? (
            <>
              <Flag code={selected.flagCode} className="shrink-0 text-base" />
              <span className="truncate text-slate-900">{selected.name}</span>
            </>
          ) : (
            <span className="text-slate-400">{placeholder}</span>
          )}
        </span>
        <Icon
          name="down"
          size={16}
          className={cx(
            "shrink-0 text-slate-400 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-30 mt-1.5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card-md">
          <div className="border-b border-slate-100 p-2">
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Search teams…"
              className="w-full rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-green-500 focus:bg-white"
            />
          </div>
          <ul ref={listRef} role="listbox" className="max-h-64 overflow-auto p-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-slate-400">
                No teams found
              </li>
            ) : (
              filtered.map((t, i) => {
                const isSel = t.ticker === value;
                const isActive = i === active;
                return (
                  <li
                    key={t.ticker}
                    role="option"
                    aria-selected={isSel}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => choose(t.ticker)}
                    className={cx(
                      "flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
                      isActive ? "bg-green-50" : "",
                      isSel ? "font-semibold text-slate-900" : "text-slate-700",
                    )}
                  >
                    <Flag code={t.flagCode} className="shrink-0 text-base" />
                    <span className="flex-1 truncate">{t.name}</span>
                    <span className="text-xs text-slate-400">${t.ticker}</span>
                    {isSel && (
                      <Icon name="check" size={15} className="text-green-600" />
                    )}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
