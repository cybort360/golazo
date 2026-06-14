"use client";

// Formation-first pitch editor: pick a formation, fill the slots from your 15,
// set captain + vice, save your XI. Used both in team creation and to change a
// lineup each gameweek. Validation is delegated to the pure validateLineup.

import { useMemo, useState } from "react";
import { Flag } from "@/components/Flag";
import { Icon } from "@/components/Icon";
import Select from "@/components/Select";
import { TEAMS } from "@/constants/teams";
import { validateLineup } from "@/lib/fpl/squad";
import { autoLineup } from "@/lib/fpl/autoLineup";
import type { FplPlayer, GameweekLineup, Position } from "@/lib/fpl/types";

const FLAG = new Map(TEAMS.map((t) => [t.ticker, t.flagCode]));
const flagOf = (tk: string) => FLAG.get(tk) ?? null;

// Legal outfield shapes (GK is always 1): [DEF, MID, FWD].
const FORMATIONS: [number, number, number][] = [
  [3, 4, 3], [3, 5, 2], [4, 3, 3], [4, 4, 2], [4, 5, 1], [5, 2, 3], [5, 3, 2], [5, 4, 1],
];
const ROWS: Position[] = ["GK", "DEF", "MID", "FWD"];

type Picks = Record<Position, string[]>;

function groupByPos(ids: string[], posOf: (id: string) => Position | undefined): Picks {
  const p: Picks = { GK: [], DEF: [], MID: [], FWD: [] };
  for (const id of ids) {
    const pos = posOf(id);
    if (pos) p[pos].push(id);
  }
  return p;
}

function shortName(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? parts[parts.length - 1] : name;
}

export default function LineupEditor({
  squad,
  pool,
  initial,
  onSave,
  saveLabel = "Save lineup",
}: {
  squad: string[];
  pool: FplPlayer[];
  initial: GameweekLineup | null;
  onSave: (lineup: GameweekLineup) => Promise<{ ok: boolean; error?: string }>;
  saveLabel?: string;
}) {
  const lookup = useMemo(() => {
    const m = new Map(pool.map((p) => [p.id, p]));
    return (id: string) => m.get(id);
  }, [pool]);
  const posOf = (id: string) => lookup(id)?.position;

  const base = useMemo(() => initial ?? autoLineup(squad, lookup), [initial, squad, lookup]);
  const baseGrouped = useMemo(() => groupByPos(base.starters, posOf), [base]); // eslint-disable-line react-hooks/exhaustive-deps

  const [formation, setFormation] = useState<[number, number, number]>([
    baseGrouped.DEF.length || 4,
    baseGrouped.MID.length || 4,
    baseGrouped.FWD.length || 2,
  ]);
  const [picks, setPicks] = useState<Picks>(baseGrouped);
  const [captain, setCaptain] = useState(base.captain);
  const [vice, setVice] = useState(base.viceCaptain);
  const [picking, setPicking] = useState<Position | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const counts: Record<Position, number> = {
    GK: 1, DEF: formation[0], MID: formation[1], FWD: formation[2],
  };

  const changeFormation = (d: number, m: number, f: number) => {
    setError(null);
    setFormation([d, m, f]);
    setPicks((p) => ({
      GK: p.GK.slice(0, 1),
      DEF: p.DEF.slice(0, d),
      MID: p.MID.slice(0, m),
      FWD: p.FWD.slice(0, f),
    }));
    setPicking(null);
    setMenuFor(null);
  };

  const startersFlat = [...picks.GK, ...picks.DEF, ...picks.MID, ...picks.FWD];
  const startSet = new Set(startersFlat);
  const bench = squad.filter((id) => !startSet.has(id));

  const fill = (pos: Position, id: string) => {
    setPicks((p) => (p[pos].length >= counts[pos] ? p : { ...p, [pos]: [...p[pos], id] }));
    setPicking(null);
  };

  const removeFromXI = (id: string) => {
    const pos = posOf(id);
    if (!pos) return;
    setPicks((p) => ({ ...p, [pos]: p[pos].filter((x) => x !== id) }));
    if (captain === id) setCaptain("");
    if (vice === id) setVice("");
    setMenuFor(null);
  };

  const available = (pos: Position) =>
    squad.filter((id) => posOf(id) === pos && !picks[pos].includes(id));

  const save = async () => {
    setError(null);
    if (!captain || !startSet.has(captain)) return setError("Pick a captain from your XI");
    if (!vice || !startSet.has(vice)) return setError("Pick a vice-captain from your XI");
    const lineup: GameweekLineup = { starters: startersFlat, bench, captain, viceCaptain: vice };
    const check = validateLineup(lineup, squad, lookup);
    if (!check.ok) return setError(check.error);
    setBusy(true);
    const res = await onSave(lineup);
    setBusy(false);
    if (!res.ok) setError(res.error ?? "Could not save");
  };

  const fmtLabel = (f: [number, number, number]) => f.join("-");
  const totalPicked = startersFlat.length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-sm text-slate-600">
          Formation
          <Select
            value={fmtLabel(formation)}
            options={FORMATIONS.map((f) => ({ value: fmtLabel(f), label: fmtLabel(f) }))}
            onChange={(v) => {
              const [d, m, f] = v.split("-").map(Number);
              changeFormation(d, m, f);
            }}
            className="w-28"
          />
        </label>
        <span className="text-xs text-slate-400 tabular-nums">{totalPicked}/11 on the pitch</span>
      </div>

      {/* Pitch */}
      <div
        className="relative flex min-h-[30rem] overflow-hidden rounded-2xl p-4 shadow-inner"
        style={{
          background:
            "repeating-linear-gradient(to bottom, #15803d 0 2.5rem, #18a14b 2.5rem 5rem)",
        }}
      >
        {/* Pitch markings */}
        <div className="pointer-events-none absolute inset-0 text-white/25">
          <div className="absolute inset-3 rounded-md border-2 border-current" />
          {/* halfway line + centre circle + spot */}
          <div className="absolute inset-x-3 top-1/2 border-t-2 border-current" />
          <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-current" />
          <div className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/40" />
          {/* top penalty + six-yard boxes */}
          <div className="absolute left-1/2 top-3 h-16 w-52 max-w-[70%] -translate-x-1/2 border-2 border-t-0 border-current" />
          <div className="absolute left-1/2 top-3 h-7 w-28 max-w-[45%] -translate-x-1/2 border-2 border-t-0 border-current" />
          {/* bottom penalty + six-yard boxes */}
          <div className="absolute bottom-3 left-1/2 h-16 w-52 max-w-[70%] -translate-x-1/2 border-2 border-b-0 border-current" />
          <div className="absolute bottom-3 left-1/2 h-7 w-28 max-w-[45%] -translate-x-1/2 border-2 border-b-0 border-current" />
        </div>

        {/* Player rows */}
        <div className="relative z-10 flex flex-1 flex-col justify-between gap-3">
        {ROWS.map((pos) => {
          const slots = counts[pos];
          const filled = picks[pos];
          return (
            <div key={pos} className="flex w-full items-center justify-evenly gap-1 px-1">
              {Array.from({ length: slots }).map((_, i) => {
                const id = filled[i];
                if (!id) {
                  return (
                    <button
                      key={`${pos}-${i}`}
                      type="button"
                      onClick={() => { setPicking(pos); setMenuFor(null); }}
                      className="flex h-16 w-16 flex-col items-center justify-center rounded-lg border-2 border-dashed border-white/40 text-white/70 transition-colors hover:bg-white/10"
                    >
                      <span className="text-lg leading-none">+</span>
                      <span className="text-[10px] font-semibold uppercase">{pos}</span>
                    </button>
                  );
                }
                const p = lookup(id);
                const isC = captain === id;
                const isV = vice === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setMenuFor((m) => (m === id ? null : id))}
                    className="relative flex h-16 w-16 flex-col items-center justify-center gap-0.5 rounded-lg bg-white px-1 shadow-sm"
                  >
                    {(isC || isV) && (
                      <span className={`absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white ${isC ? "bg-amber-500" : "bg-slate-400"}`}>
                        {isC ? "C" : "V"}
                      </span>
                    )}
                    {p && <Flag code={flagOf(p.team)} className="text-sm" />}
                    <span className="w-full truncate text-center text-[11px] font-semibold text-slate-800">
                      {p ? shortName(p.name) : "?"}
                    </span>
                  </button>
                );
              })}
            </div>
          );
        })}
        </div>
      </div>

      {/* Chooser when filling a slot */}
      {picking && (
        <div className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-white p-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pick a {picking}</span>
            <button type="button" onClick={() => setPicking(null)} className="text-xs text-slate-400">close</button>
          </div>
          <div className="flex max-h-56 flex-col divide-y divide-slate-100 overflow-auto">
            {available(picking).map((id) => {
              const p = lookup(id)!;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => fill(picking, id)}
                  className="flex items-center justify-between px-2 py-1.5 text-sm hover:bg-slate-50"
                >
                  <span className="flex items-center gap-2">
                    <Flag code={flagOf(p.team)} className="text-sm" />
                    <span className="font-medium text-slate-800">{p.name}</span>
                  </span>
                  <span className="text-xs tabular-nums text-slate-400">{p.price.toFixed(1)}</span>
                </button>
              );
            })}
            {available(picking).length === 0 && (
              <p className="px-2 py-3 text-center text-xs text-slate-400">All your {picking}s are on the pitch.</p>
            )}
          </div>
        </div>
      )}

      {/* Action menu for a picked player */}
      {menuFor && (
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 text-sm">
          <span className="px-1 font-medium text-slate-700">{shortName(lookup(menuFor)?.name ?? "")}</span>
          <button type="button" onClick={() => { setCaptain(menuFor); if (vice === menuFor) setVice(""); setMenuFor(null); }} className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">Captain</button>
          <button type="button" onClick={() => { setVice(menuFor); if (captain === menuFor) setCaptain(""); setMenuFor(null); }} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">Vice</button>
          <button type="button" onClick={() => removeFromXI(menuFor)} className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500">Bench</button>
        </div>
      )}

      {/* Bench */}
      <div className="flex flex-col gap-1">
        <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Bench</span>
        <div className="flex flex-wrap gap-2">
          {bench.length === 0 ? (
            <span className="text-xs text-slate-400">Fill your XI — benched players appear here.</span>
          ) : (
            bench.map((id) => {
              const p = lookup(id);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => { const pos = posOf(id); if (pos) { setPicking(pos); } }}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"
                >
                  {p && <Flag code={flagOf(p.team)} className="text-xs" />}
                  <span className="font-medium text-slate-700">{p ? shortName(p.name) : "?"}</span>
                  <span className="text-slate-400">{p?.position}</span>
                </button>
              );
            })
          )}
        </div>
      </div>

      {error && <p className="text-sm font-medium text-red-600">{error}</p>}
      <button
        type="button"
        onClick={save}
        disabled={busy || totalPicked !== 11}
        className="flex w-fit items-center gap-1.5 rounded-full bg-green-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-50"
      >
        <Icon name="check" size={15} />
        {busy ? "Saving…" : saveLabel}
      </button>
    </div>
  );
}
