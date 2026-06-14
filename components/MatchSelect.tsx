"use client";

import { useEffect, useRef, useState } from "react";
import type { ScheduledMatch } from "@/constants/schedule";
import { TEAMS } from "@/constants/teams";
import { stadiumName } from "@/lib/venues";
import { Flag } from "@/components/Flag";
import { Icon } from "@/components/Icon";

function cx(...c: Array<string | false | null | undefined>): string {
  return c.filter(Boolean).join(" ");
}

const FLAG_BY_TICKER = new Map(TEAMS.map((t) => [t.ticker, t.flagCode]));
const NAME_BY_TICKER = new Map(TEAMS.map((t) => [t.ticker, t.name]));

function searchText(m: ScheduledMatch): string {
  const an = NAME_BY_TICKER.get(m.teamA) ?? "";
  const bn = NAME_BY_TICKER.get(m.teamB) ?? "";
  return `${m.id} ${m.teamA} ${m.teamB} ${an} ${bn} ${m.date} ${m.time} ${m.groupOrRound} ${m.venue} ${stadiumName(m.venue)}`.toLowerCase();
}

function MatchTeams({ m }: { m: ScheduledMatch }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <Flag code={FLAG_BY_TICKER.get(m.teamA) ?? null} className="shrink-0 text-sm" />
      <span className="font-medium">{m.teamA}</span>
      <span className="text-slate-400">vs</span>
      <Flag code={FLAG_BY_TICKER.get(m.teamB) ?? null} className="shrink-0 text-sm" />
      <span className="font-medium">{m.teamB}</span>
    </span>
  );
}

// Searchable match picker, matching the styling of TeamSelect. Replaces the
// native <input list> / <datalist> combo, which can't be themed and shows raw
// label strings. Lists matches with both team flags and the kickoff date.
export default function MatchSelect({
  matches,
  value,
  onChange,
  placeholder = "Search by team or date…",
}: {
  matches: ScheduledMatch[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = matches.find((m) => m.id === value);
  const q = query.trim().toLowerCase();
  const filtered = q ? matches.filter((m) => searchText(m).includes(q)) : matches;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActive(0);
    const id = requestAnimationFrame(() => searchRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => setActive(0), [query]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.children[active] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const choose = (id: string) => {
    onChange(id);
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
      const m = filtered[active];
      if (m) choose(m.id);
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
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors hover:border-slate-400 focus:border-green-500 focus:ring-2 focus:ring-green-500/30"
      >
        {selected ? (
          <MatchTeams m={selected} />
        ) : (
          <span className="text-slate-400">{placeholder}</span>
        )}
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
              placeholder="Search by team, date or round…"
              className="w-full rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-green-500 focus:bg-white"
            />
          </div>
          <ul ref={listRef} role="listbox" className="max-h-72 overflow-auto p-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-slate-400">
                No matches found
              </li>
            ) : (
              filtered.map((m, i) => {
                const isSel = m.id === value;
                const isActive = i === active;
                return (
                  <li
                    key={m.id}
                    role="option"
                    aria-selected={isSel}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => choose(m.id)}
                    className={cx(
                      "flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors",
                      isActive ? "bg-green-50" : "",
                      isSel ? "text-slate-900" : "text-slate-700",
                    )}
                  >
                    <MatchTeams m={m} />
                    <span className="ml-auto shrink-0 whitespace-nowrap text-xs text-slate-400">
                      {m.date} · {m.time}
                    </span>
                    {isSel && (
                      <Icon
                        name="check"
                        size={15}
                        className="shrink-0 text-green-600"
                      />
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
