"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { usePrediction } from "@/hooks/usePrediction";
import { useFantasy } from "@/hooks/useFantasy";
import { useTokenAddresses } from "@/hooks/useTokenAddresses";
import { validateSquad, squadPrice, BUDGET } from "@/lib/fpl/squad";
import { autoLineup } from "@/lib/fpl/autoLineup";
import { GAMEWEEKS } from "@/lib/fpl/gameweeks";
import { payGolazoEntry } from "@/lib/golazoPay";
import { formatCountdownPrecise } from "@/lib/time";
import { Flag } from "@/components/Flag";
import { Icon } from "@/components/Icon";
import TeamSelect from "@/components/TeamSelect";
import LineupEditor from "@/components/LineupEditor";
import { TEAMS } from "@/constants/teams";
import type { FplPlayer, FplTeam, Gameweek, GameweekLineup, Position } from "@/lib/fpl/types";

const POSITIONS: Position[] = ["GK", "DEF", "MID", "FWD"];
const SQUAD_BY_POSITION: Record<Position, number> = { GK: 2, DEF: 5, MID: 5, FWD: 3 };

// Map a team ticker (e.g. "BRA") to its flag-icons code and full country name.
const FLAG_BY_TICKER = new Map(TEAMS.map((t) => [t.ticker, t.flagCode]));
const NAME_BY_TICKER = new Map(TEAMS.map((t) => [t.ticker, t.name]));
const flagOf = (ticker: string) => FLAG_BY_TICKER.get(ticker) ?? null;
const teamName = (ticker: string) => NAME_BY_TICKER.get(ticker) ?? ticker;

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
  // Full team objects (name + flag) for the teams actually present in the pool.
  const filterTeams = useMemo(() => {
    const present = new Set(pool.map((p) => p.team));
    return TEAMS.filter((t) => present.has(t.ticker));
  }, [pool]);

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
        <div className="w-48">
          <TeamSelect
            teams={filterTeams}
            value={teamFilter}
            onChange={setTeamFilter}
            allLabel="All teams"
            showTicker={false}
          />
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search players"
          className="min-w-[8rem] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-green-500/40 focus:ring-2"
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
                <span className="text-xs text-slate-400">{teamName(p.team)} · {p.position}</span>
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
  onSetLineup,
}: {
  team: FplTeam;
  pool: FplPlayer[];
  upcoming: Gameweek | null;
  onTransfer: (name: string, squad: string[]) => Promise<{ ok: boolean; error?: string }>;
  onSetLineup: (lineup: GameweekLineup) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [editing, setEditing] = useState(false);
  const [editingLineup, setEditingLineup] = useState(false);
  const lookup = useMemo(() => lookupFrom(pool), [pool]);
  const lineup = upcoming ? team.lineups[upcoming.id] : undefined;
  const captain = lineup?.captain;

  if (editingLineup) {
    return (
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => setEditingLineup(false)}
          className="w-fit text-xs font-semibold text-slate-500 underline underline-offset-2"
        >
          ← Back to team
        </button>
        <LineupEditor
          squad={team.squad}
          pool={pool}
          initial={lineup ?? null}
          saveLabel="Save lineup"
          onSave={async (l) => {
            const res = await onSetLineup(l);
            if (res.ok) setEditingLineup(false);
            return res;
          }}
        />
      </div>
    );
  }

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
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setEditingLineup(true)}
              className="rounded-full bg-green-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-green-700"
            >
              Pick lineup
            </button>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-full border border-slate-300 px-4 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Transfers
            </button>
          </div>
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

// ── Private leagues ─────────────────────────────────────────────────────────

interface LeagueSummary {
  code: string;
  name: string;
  entryFee: number;
  startGw: string;
  status: string;
  memberCount: number;
}
interface LeagueDetail {
  league: { code: string; name: string; entryFee: number; status: string; memberCount: number; winnerId: string | null };
  pot: { pot: number; rake: number; net: number };
  standings: { playerId: string; name: string; points: number }[];
}

function LeaguesSection({ token }: { token: string | null }) {
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const { setVisible } = useWalletModal();
  const { golazo } = useTokenAddresses();

  const treasury = process.env.NEXT_PUBLIC_GOLAZO_TREASURY_WALLET;
  const mint = golazo.address;
  const live = Boolean(treasury && mint);

  const upcoming = useMemo(
    () => GAMEWEEKS.filter((g) => g.deadlineMs > Date.now()),
    [],
  );

  const [mine, setMine] = useState<LeagueSummary[]>([]);
  const [view, setView] = useState<LeagueDetail | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [fee, setFee] = useState("");
  const [startGw, setStartGw] = useState(upcoming[0]?.id ?? "");
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const authHeaders = useMemo<Record<string, string>>(() => {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (token) h.authorization = `Bearer ${token}`;
    return h;
  }, [token]);

  const loadMine = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/fantasy/leagues/mine", { cache: "no-store", headers: authHeaders });
      const d = (await res.json()) as { leagues?: LeagueSummary[] };
      setMine(d.leagues ?? []);
    } catch {
      /* ignore */
    }
  }, [token, authHeaders]);

  useEffect(() => {
    void loadMine();
  }, [loadMine]);

  const openLeague = async (code: string) => {
    setMsg(null);
    try {
      const res = await fetch(`/api/fantasy/league/${code}`, { cache: "no-store" });
      if (res.ok) setView((await res.json()) as LeagueDetail);
    } catch {
      setMsg("Couldn't load that league");
    }
  };

  const create = async () => {
    setMsg(null);
    setBusy(true);
    try {
      const res = await fetch("/api/fantasy/league", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ name, entryFee: Number(fee), startGw }),
      });
      const d = (await res.json()) as { ok?: boolean; error?: string; code?: string };
      if (!res.ok || !d.ok) setMsg(d.error ?? "Could not create league");
      else {
        setMsg(`League created — share code ${d.code}. Join it below to enter.`);
        setShowCreate(false);
        setName("");
        setFee("");
        await loadMine();
      }
    } catch {
      setMsg("Network error");
    } finally {
      setBusy(false);
    }
  };

  const join = async (code: string, entryFee: number) => {
    setMsg(null);
    if (!live) return setMsg("Leagues open once $GOLAZO launches.");
    if (!publicKey || !sendTransaction) {
      setVisible(true);
      return;
    }
    setBusy(true);
    try {
      const sig = await payGolazoEntry({
        connection,
        owner: publicKey,
        sendTransaction,
        mint: mint!,
        treasury: treasury!,
        uiAmount: entryFee,
      });
      const res = await fetch("/api/fantasy/league/join", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ code, txSig: sig }),
      });
      const d = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !d.ok) setMsg(d.error ?? "Could not join");
      else {
        setMsg("You're in! Good luck.");
        await loadMine();
        await openLeague(code);
      }
    } catch {
      setMsg("Payment was cancelled or failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">
          Private leagues
        </h2>
        <button
          type="button"
          onClick={() => setShowCreate((s) => !s)}
          className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          {showCreate ? "Cancel" : "Create league"}
        </button>
      </div>

      {!live && (
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
          Entry-fee leagues go live once $GOLAZO launches. You can look around now;
          paying to join will open then.
        </p>
      )}

      {showCreate && (
        <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="League name"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-green-500/40 focus:ring-2"
          />
          <div className="flex gap-2">
            <input
              value={fee}
              onChange={(e) => setFee(e.target.value)}
              inputMode="numeric"
              placeholder="Entry fee ($GOLAZO)"
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-green-500/40 focus:ring-2"
            />
            <select
              value={startGw}
              onChange={(e) => setStartGw(e.target.value)}
              className="rounded-lg border border-slate-300 px-2 text-sm"
            >
              {upcoming.map((g) => (
                <option key={g.id} value={g.id}>{g.label}</option>
              ))}
            </select>
          </div>
          <p className="text-[11px] text-slate-400">
            90% of the pot goes to the winner; 10% platform fee. Runs from the
            chosen gameweek to the Final.
          </p>
          <button
            type="button"
            onClick={create}
            disabled={busy || !token}
            className="w-fit rounded-full bg-green-600 px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            Create
          </button>
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          placeholder="Enter invite code"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase outline-none ring-green-500/40 focus:ring-2"
        />
        <button
          type="button"
          onClick={() => joinCode && openLeague(joinCode)}
          className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
        >
          View
        </button>
      </div>

      {mine.length > 0 && (
        <div className="flex flex-col divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {mine.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => openLeague(l.code)}
              className="flex items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50"
            >
              <span className="font-semibold text-slate-800">{l.name}</span>
              <span className="text-xs text-slate-400">
                {l.memberCount} in · {l.entryFee.toLocaleString()} $GOLAZO · {l.code}
              </span>
            </button>
          ))}
        </div>
      )}

      {view && (
        <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-900">{view.league.name}</span>
            <button type="button" onClick={() => setView(null)} className="text-xs text-slate-400 hover:text-slate-600">
              close
            </button>
          </div>
          <p className="text-xs text-slate-500">
            Code <span className="font-mono font-semibold">{view.league.code}</span> ·{" "}
            {view.league.memberCount} in · winner gets{" "}
            <span className="font-semibold text-green-700">{view.pot.net.toLocaleString()} $GOLAZO</span>
          </p>
          {view.standings.length > 0 ? (
            <div className="overflow-hidden rounded-lg border border-slate-100">
              {view.standings.map((r, i) => (
                <div key={r.playerId} className="flex items-center justify-between border-b border-slate-100 px-2.5 py-1.5 text-sm last:border-b-0">
                  <span className="flex items-center gap-2">
                    <span className="w-4 tabular-nums text-slate-400">{i + 1}</span>
                    <span className="font-medium text-slate-800">{r.name}</span>
                  </span>
                  <span className="font-bold tabular-nums text-green-600">{r.points}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400">No members yet — be the first to join.</p>
          )}
          {view.league.status === "open" && (
            <button
              type="button"
              onClick={() => join(view.league.code, view.league.entryFee)}
              disabled={busy || !live}
              className="w-fit rounded-full bg-green-600 px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy ? "Processing…" : `Pay ${view.league.entryFee.toLocaleString()} $GOLAZO & join`}
            </button>
          )}
          {view.league.status === "settled" && (
            <p className="text-xs font-semibold text-amber-600">Settled — winner paid.</p>
          )}
        </div>
      )}

      {msg && <p className="text-sm font-medium text-slate-700">{msg}</p>}
    </section>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function FantasyPage() {
  const { reg, loaded: regLoaded } = usePrediction();
  // NEXT_PUBLIC_FANTASY_DEV lets the builder render locally without a KV-backed
  // sign-in (saving still needs KV). Off in production.
  const token =
    reg?.token ??
    (process.env.NEXT_PUBLIC_FANTASY_DEV === "1" ? "dev-preview" : null);
  const { pool, mine, loaded, createTeam, setLineup, transfer } = useFantasy(token);

  const upcoming = mine?.gw.upcoming ?? null;
  const lookup = useMemo(() => lookupFrom(pool), [pool]);

  // Create flow: pick 15 → set the XI on the pitch → save squad + lineup.
  const [draft, setDraft] = useState<{ name: string; squad: string[] } | null>(null);
  const onPickSquad = async (name: string, squad: string[]) => {
    setDraft({ name, squad });
    return { ok: true };
  };
  const onTransfer = async (_name: string, squad: string[]) =>
    transfer(squad, autoLineup(squad, lookup));

  const [tab, setTab] = useState<"team" | "leagues" | "board">("team");

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
      ) : (
        <>
          <div className="flex gap-0.5 self-start rounded-full bg-slate-100 p-1 text-sm font-semibold">
            {([["team", "My Team"], ["leagues", "Leagues"], ["board", "Leaderboard"]] as const).map(
              ([k, label]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setTab(k)}
                  className={`rounded-full px-4 py-1.5 transition-colors ${
                    tab === k ? "bg-white text-green-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {label}
                </button>
              ),
            )}
          </div>

          {tab === "team" &&
            (pool.length === 0 ? (
              <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                The player pool isn&apos;t live yet — check back once the squads are loaded.
              </p>
            ) : mine?.team ? (
              <div className="flex flex-col gap-4">
                {mine.threshold > 0 && (
                  <p className={`text-xs ${mine.eligible ? "text-green-700" : "text-amber-700"}`}>
                    {mine.eligible
                      ? "✓ Eligible for the SOL pot — holding enough $GOLAZO."
                      : `Hold ${mine.threshold.toLocaleString()} $GOLAZO to be pot-eligible (you have ${(mine.golazoBalance ?? 0).toLocaleString()}).`}
                  </p>
                )}
                <TeamView
                  team={mine.team}
                  pool={pool}
                  upcoming={upcoming}
                  onTransfer={onTransfer}
                  onSetLineup={setLineup}
                />
              </div>
            ) : !upcoming ? (
              <p className="text-sm text-slate-500">The tournament is over — no new teams.</p>
            ) : draft ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-slate-900">Pick your XI</h2>
                  <button
                    type="button"
                    onClick={() => setDraft(null)}
                    className="text-xs font-semibold text-slate-500 underline underline-offset-2"
                  >
                    ← Edit squad
                  </button>
                </div>
                <LineupEditor
                  squad={draft.squad}
                  pool={pool}
                  initial={null}
                  saveLabel="Save team"
                  onSave={async (lineup) => {
                    const res = await createTeam(draft.name, draft.squad, lineup);
                    if (res.ok) setDraft(null);
                    return res;
                  }}
                />
              </div>
            ) : (
              <SquadBuilder pool={pool} initial={null} mode="create" onSubmit={onPickSquad} />
            ))}

          {tab === "leagues" && <LeaguesSection token={token} />}

          {tab === "board" && (
            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">
                Overall leaderboard
              </h2>
              <Leaderboard meName={mine?.team?.name ?? null} />
            </section>
          )}
        </>
      )}
    </div>
  );
}
