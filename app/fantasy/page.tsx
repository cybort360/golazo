"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePrediction } from "@/hooks/usePrediction";
import { useFantasy } from "@/hooks/useFantasy";
import { validateSquad, squadPrice, BUDGET } from "@/lib/fpl/squad";
import { autoLineup } from "@/lib/fpl/autoLineup";
import { formatCountdownPrecise } from "@/lib/time";
import { Flag } from "@/components/Flag";
import { Icon } from "@/components/Icon";
import { TEAMS } from "@/constants/teams";
import type { FplPlayer, FplTeam, Gameweek, Position } from "@/lib/fpl/types";

const POSITIONS: Position[] = ["GK", "DEF", "MID", "FWD"];
const SQUAD_BY_POSITION: Record<Position, number> = { GK: 2, DEF: 5, MID: 5, FWD: 3 };

// Map a team ticker (e.g. "BRA") to its flag-icons code (e.g. "br").
const FLAG_BY_TICKER = new Map(TEAMS.map((t) => [t.ticker, t.flagCode]));
const flagOf = (ticker: string) => FLAG_BY_TICKER.get(ticker) ?? null;

function lookupFrom(pool: FplPlayer[]) {
  const byId = new Map(pool.map((p) => [p.id, p]));
  return (id: string) => byId.get(id);
}

// ── Squad builder (used for both initial pick and transfers) ───────────────────

function SquadBuilder({
  pool,
  initial,
  mode,
  onSubmit,
}: {
  pool: FplPlayer[];
  initial: string[] | null;
  mode: "create" | "transfer";
  onSubmit: (name: string, squad: string[]) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [selected, setSelected] = useState<string[]>(initial ?? []);
  const [name, setName] = useState("");
  const [posTab, setPosTab] = useState<Position>("GK");
  const [teamFilter, setTeamFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const lookup = useMemo(() => lookupFrom(pool), [pool]);
  const teams = useMemo(
    () => Array.from(new Set(pool.map((p) => p.team))).sort(),
    [pool],
  );

  const selSet = new Set(selected);
  const counts = useMemo(() => {
    const c: Record<Position, number> = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
    for (const id of selected) {
      const p = lookup(id);
      if (p) c[p.position]++;
    }
    return c;
  }, [selected, lookup]);
  const spent = squadPrice(selected, lookup);
  const remaining = BUDGET - spent;

  const perTeam = useMemo(() => {
    const c = new Map<string, number>();
    for (const id of selected) {
      const t = lookup(id)?.team;
      if (t) c.set(t, (c.get(t) ?? 0) + 1);
    }
    return c;
  }, [selected, lookup]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return pool
      .filter((p) => p.position === posTab)
      .filter((p) => !teamFilter || p.team === teamFilter)
      .filter((p) => !q || p.name.toLowerCase().includes(q))
      .sort((a, b) => b.price - a.price)
      .slice(0, 80);
  }, [pool, posTab, teamFilter, search]);

  const toggle = (p: FplPlayer) => {
    setError(null);
    if (selSet.has(p.id)) {
      setSelected((s) => s.filter((id) => id !== p.id));
      return;
    }
    if (selected.length >= 15) return setError("Squad is full (15)");
    if (counts[p.position] >= SQUAD_BY_POSITION[p.position]) {
      return setError(`You already have ${SQUAD_BY_POSITION[p.position]} ${p.position}`);
    }
    if ((perTeam.get(p.team) ?? 0) >= 3) return setError("Max 3 from one country");
    if (p.price > remaining + 1e-9) return setError("Not enough budget");
    setSelected((s) => [...s, p.id]);
  };

  const submit = async () => {
    setError(null);
    const check = validateSquad(selected, lookup);
    if (!check.ok) return setError(check.error);
    if (mode === "create" && name.trim().length < 3) {
      return setError("Pick a team name (3+ characters)");
    }
    setBusy(true);
    const res = await onSubmit(name.trim(), selected);
    setBusy(false);
    if (!res.ok) setError(res.error ?? "Could not save");
  };

  return (
    <section className="flex flex-col gap-4">
      {mode === "create" && (
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Team name"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-green-500/40 focus:ring-2"
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-3 text-sm shadow-card">
        <span className="font-semibold text-slate-700">
          {selected.length}/15 picked
        </span>
        <span className="flex gap-3 text-xs text-slate-500">
          {POSITIONS.map((pos) => (
            <span key={pos} className={counts[pos] === SQUAD_BY_POSITION[pos] ? "text-green-600 font-semibold" : ""}>
              {pos} {counts[pos]}/{SQUAD_BY_POSITION[pos]}
            </span>
          ))}
        </span>
        <span className={`font-bold tabular-nums ${remaining < 0 ? "text-red-600" : "text-slate-900"}`}>
          {remaining.toFixed(1)} left
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-0.5 rounded-full bg-slate-100 p-1 text-xs font-semibold">
          {POSITIONS.map((pos) => (
            <button
              key={pos}
              type="button"
              onClick={() => setPosTab(pos)}
              className={`rounded-full px-3 py-1 ${posTab === pos ? "bg-white text-green-600 shadow-sm" : "text-slate-500"}`}
            >
              {pos}
            </button>
          ))}
        </div>
        <select
          value={teamFilter}
          onChange={(e) => setTeamFilter(e.target.value)}
          className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
        >
          <option value="">All teams</option>
          {teams.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs outline-none ring-green-500/40 focus:ring-2"
        />
      </div>

      <div className="flex flex-col divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {filtered.map((p) => {
          const picked = selSet.has(p.id);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => toggle(p)}
              className={`flex items-center justify-between px-3 py-2 text-left text-sm transition-colors ${picked ? "bg-green-50" : "hover:bg-slate-50"}`}
            >
              <span className="flex items-center gap-2">
                <Flag code={flagOf(p.team)} className="text-sm" />
                <span className="font-medium text-slate-800">{p.name}</span>
                <span className="text-xs text-slate-400">{p.team} · {p.position}</span>
              </span>
              <span className="flex items-center gap-3">
                <span className="font-semibold tabular-nums text-slate-700">{p.price.toFixed(1)}</span>
                {picked ? (
                  <Icon name="check" size={15} className="text-green-600" />
                ) : (
                  <span className="text-base font-semibold leading-none text-slate-400">+</span>
                )}
              </span>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <p className="px-3 py-6 text-center text-sm text-slate-400">No players match.</p>
        )}
      </div>

      {error && <p className="text-sm font-medium text-red-600">{error}</p>}
      <button
        type="button"
        onClick={submit}
        disabled={busy || selected.length !== 15}
        className="w-fit rounded-full bg-green-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-50"
      >
        {busy ? "Saving…" : mode === "create" ? "Save team" : "Confirm transfers"}
      </button>
    </section>
  );
}

// ── Team view ──────────────────────────────────────────────────────────────────

function Deadline({ ms }: { ms: number }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const t = () => setNow(Date.now());
    t();
    const id = setInterval(t, 1000);
    return () => clearInterval(id);
  }, []);
  if (now === null) return null;
  const diff = ms - now;
  return (
    <span suppressHydrationWarning className="tabular-nums">
      {diff <= 0 ? "locked" : `locks in ${formatCountdownPrecise(diff)}`}
    </span>
  );
}

function TeamView({
  team,
  pool,
  upcoming,
  onTransfer,
}: {
  team: FplTeam;
  pool: FplPlayer[];
  upcoming: Gameweek | null;
  onTransfer: (name: string, squad: string[]) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [editing, setEditing] = useState(false);
  const lookup = useMemo(() => lookupFrom(pool), [pool]);
  const lineup = upcoming ? team.lineups[upcoming.id] : undefined;
  const captain = lineup?.captain;

  if (editing) {
    return (
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="w-fit text-xs font-semibold text-slate-500 underline underline-offset-2"
        >
          ← Back to team
        </button>
        <SquadBuilder
          pool={pool}
          initial={team.squad}
          mode="transfer"
          onSubmit={async (_n, squad) => {
            const res = await onTransfer(team.name, squad);
            if (res.ok) setEditing(false);
            return res;
          }}
        />
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-slate-900">{team.name}</h2>
        {upcoming && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-full border border-slate-300 px-4 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Transfers
          </button>
        )}
      </div>
      {upcoming && (
        <p className="text-xs text-slate-500">
          {upcoming.label} — <Deadline ms={upcoming.deadlineMs} />
        </p>
      )}

      {POSITIONS.map((pos) => {
        const players = team.squad
          .map(lookup)
          .filter((p): p is FplPlayer => !!p && p.position === pos);
        if (players.length === 0) return null;
        return (
          <div key={pos} className="flex flex-col gap-1">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400">{pos}</h3>
            <div className="flex flex-col divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
              {players.map((p) => {
                const starting = lineup?.starters.includes(p.id);
                return (
                  <div key={p.id} className="flex items-center justify-between px-3 py-2 text-sm">
                    <span className="flex items-center gap-2">
                      <Flag code={flagOf(p.team)} className="text-sm" />
                      <span className="font-medium text-slate-800">{p.name}</span>
                      {p.id === captain && (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">C</span>
                      )}
                      {lineup && !starting && (
                        <span className="text-[10px] font-semibold uppercase text-slate-400">bench</span>
                      )}
                    </span>
                    <span className="font-semibold tabular-nums text-slate-600">{p.price.toFixed(1)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </section>
  );
}

// ── Leaderboard ──────────────────────────────────────────────────────────────

interface FantasyRow {
  playerId: string;
  name: string;
  points: number;
}

function Leaderboard({ meName }: { meName: string | null }) {
  const [rows, setRows] = useState<FantasyRow[] | null>(null);
  useEffect(() => {
    fetch("/api/fantasy/leaderboard", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { rows?: FantasyRow[] } | null) => setRows(d?.rows ?? []))
      .catch(() => setRows([]));
  }, []);
  if (rows === null) return <div className="h-24 animate-pulse rounded-xl bg-slate-100" />;
  if (rows.length === 0) return <p className="text-sm text-slate-400">No managers yet — be the first.</p>;
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      {rows.slice(0, 50).map((r, i) => (
        <div
          key={r.playerId}
          className={`flex items-center justify-between border-b border-slate-100 px-3 py-2 text-sm last:border-b-0 ${r.name === meName ? "bg-green-50" : ""}`}
        >
          <span className="flex items-center gap-2">
            <span className="w-5 tabular-nums text-slate-400">{i + 1}</span>
            <span className="font-semibold text-slate-900">{r.name}</span>
          </span>
          <span className="font-bold tabular-nums text-green-600">{r.points}</span>
        </div>
      ))}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function FantasyPage() {
  const { reg, loaded: regLoaded } = usePrediction();
  const token = reg?.token ?? null;
  const { pool, mine, loaded, createTeam, transfer } = useFantasy(token);

  const upcoming = mine?.gw.upcoming ?? null;
  const lookup = useMemo(() => lookupFrom(pool), [pool]);

  const onCreate = async (name: string, squad: string[]) =>
    createTeam(name, squad, autoLineup(squad, lookup));
  const onTransfer = async (_name: string, squad: string[]) =>
    transfer(squad, autoLineup(squad, lookup));

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6 md:py-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Fantasy</h1>
        <p className="text-sm text-slate-500">
          Pick a 15-player squad under {BUDGET.toFixed(0)}m, set your XI and captain,
          and score on real World Cup performances. Transfers each gameweek.
        </p>
      </header>

      {!regLoaded || !loaded ? (
        <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />
      ) : !token ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
          <p className="text-sm text-slate-600">
            Fantasy uses your Golazo account. Sign in on the Predict page first —
            connect your wallet there, then come back.
          </p>
          <Link
            href="/predict"
            className="w-fit rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Go to Predict to sign in
          </Link>
        </div>
      ) : pool.length === 0 ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          The player pool isn&apos;t live yet — check back once the squads are loaded.
        </p>
      ) : mine?.team ? (
        <>
          {mine.threshold > 0 && (
            <p className={`text-xs ${mine.eligible ? "text-green-700" : "text-amber-700"}`}>
              {mine.eligible
                ? "✓ Eligible for the SOL pot — holding enough $GOLAZO."
                : `Hold ${mine.threshold.toLocaleString()} $GOLAZO to be pot-eligible (you have ${(mine.golazoBalance ?? 0).toLocaleString()}).`}
            </p>
          )}
          <TeamView team={mine.team} pool={pool} upcoming={upcoming} onTransfer={onTransfer} />
        </>
      ) : !upcoming ? (
        <p className="text-sm text-slate-500">The tournament is over — no new teams.</p>
      ) : (
        <SquadBuilder pool={pool} initial={null} mode="create" onSubmit={onCreate} />
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">Leaderboard</h2>
        <Leaderboard meName={mine?.team?.name ?? null} />
      </section>
    </div>
  );
}
