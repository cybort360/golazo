"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { SCHEDULE, type ScheduledMatch } from "@/constants/schedule";
import { TEAMS } from "@/constants/teams";
import { ALL_TOKENS } from "@/constants/tokens";
import { deriveTeamStatuses } from "@/lib/standings";
import { useMatchResults, type MatchResult } from "@/hooks/useMatchResults";
import { useBuybackHistory } from "@/hooks/useBuybackHistory";
import { usePrizePool } from "@/hooks/usePrizePool";
import { useWeeklyPrize } from "@/hooks/useWeeklyPrize";
import { useTokenAddresses } from "@/hooks/useTokenAddresses";
import {
  runHolderSnapshot,
  holderSnapshotCsv,
  type HolderRow,
} from "@/lib/snapshot";
import type { WeeklyPrize } from "@/lib/weeklyPrize";
import type { BuybackEntry } from "@/lib/buyback";
import { safeHttpUrl } from "@/lib/url";
import { getKickoffMs } from "@/lib/schedule";
import { formatCountdownPrecise } from "@/lib/time";
import TeamSelect from "@/components/TeamSelect";
import MatchSelect from "@/components/MatchSelect";
import { Icon } from "@/components/Icon";

// ── Shared types & helpers ────────────────────────────────────────────────────

type ToastKind = "success" | "error";
interface AdminUI {
  showToast: (kind: ToastKind, message: string) => void;
  requestConfirm: (message: string, action: () => void | Promise<void>) => void;
}

const TEAM_BY_TICKER = new Map(TEAMS.map((t) => [t.ticker, t]));
// Admin labels are plain text / <select> options where a vector <Flag> can't be
// embedded, so derive an emoji flag from the ISO alpha-2 flagCode for readability.
function flag(ticker: string): string {
  const code = TEAM_BY_TICKER.get(ticker)?.flagCode ?? "";
  if (!/^[a-z]{2}$/.test(code)) return ""; // e.g. gb-eng / gb-sct have no emoji
  const upper = code.toUpperCase();
  return String.fromCodePoint(
    0x1f1e6 + upper.charCodeAt(0) - 65,
    0x1f1e6 + upper.charCodeAt(1) - 65,
  );
}

interface WriteResult {
  ok: boolean;
  status: number; // HTTP status, or 0 on a network error
}

async function postJson(url: string, body: unknown): Promise<WriteResult> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Be explicit so the admin cookie is always sent (some browsers, notably
      // Safari, are stricter about when cookies ride along on fetch).
      credentials: "same-origin",
      body: JSON.stringify(body),
    });
    return { ok: res.ok, status: res.status };
  } catch {
    return { ok: false, status: 0 };
  }
}

function saveKv(key: string, value: unknown): Promise<WriteResult> {
  return postJson("/api/admin/kv", { key, value });
}

// Surface a failed admin write instead of swallowing it. A silent failure once
// let a result look saved overnight and then "revert"; now every failure shows
// its HTTP status, and an expired/rejected session (401) bounces back to login
// so the write can be retried authenticated rather than lost.
function onWriteError(ui: AdminUI, status: number, context: string): void {
  if (status === 401) {
    ui.showToast("error", "Session expired — please log in again");
    setTimeout(() => {
      window.location.href = "/admin/login";
    }, 1000);
    return;
  }
  ui.showToast(
    "error",
    status === 0 ? `${context}: network error` : `${context} (HTTP ${status})`,
  );
}

function downloadCsv(filename: string, rows: string[][]): void {
  const csv = rows
    .map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── UI primitives ─────────────────────────────────────────────────────────────

function Panel({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
      <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500">
        {n}. {title}
      </h2>
      {children}
    </section>
  );
}

const btn =
  "rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors disabled:opacity-40";
const btnPrimary = `${btn} bg-green-600 text-white hover:bg-green-700`;
const btnGhost = `${btn} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`;
const btnDanger = `${btn} bg-red-50 text-red-600 ring-1 ring-red-200 hover:bg-red-100`;
const input =
  "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-green-500/40 placeholder:text-slate-400 focus:ring-2";

// ── Section 1: Submit Match Result ───────────────────────────────────────────

interface Draft {
  outcome: "A" | "B" | "draw" | "";
  buybackDone: boolean;
  buybackUrl: string;
  // Knockout fixtures carry placeholder participants ("Winner Match 73"), so the
  // admin picks the two real teams here instead of choosing teamA/teamB.
  koWinner: string;
  koLoser: string;
}
const EMPTY_DRAFT: Draft = {
  outcome: "",
  buybackDone: false,
  buybackUrl: "",
  koWinner: "",
  koLoser: "",
};

// A fixture is "resolved" once both participants are real team tickers. Group
// matches always are; knockout fixtures aren't until the admin names the teams.
const TEAMS_BY_NAME = [...TEAMS].sort((a, b) => a.name.localeCompare(b.name));
function isResolvedFixture(m: ScheduledMatch): boolean {
  return TEAM_BY_TICKER.has(m.teamA) && TEAM_BY_TICKER.has(m.teamB);
}

// Logged after a win, separately from the result, once the admin has run the
// actual buyback from their wallet. Appends to the public buyback_history feed.
function LogBuybackForm({
  ui,
  match,
  winnerTicker,
  onLogged,
}: {
  ui: AdminUI;
  match: ScheduledMatch;
  winnerTicker: string;
  onLogged: () => void;
}) {
  const [tokensBurned, setTokensBurned] = useState("");
  const [txUrl, setTxUrl] = useState("");

  const log = () => {
    if (!tokensBurned.trim() || !txUrl.trim()) {
      ui.showToast("error", "Enter tokens burned and the tx URL");
      return;
    }
    const safeUrl = safeHttpUrl(txUrl);
    if (!safeUrl) {
      ui.showToast("error", "Enter a valid http(s) tx URL");
      return;
    }
    const teamName = TEAM_BY_TICKER.get(winnerTicker)?.name ?? winnerTicker;
    const entry: BuybackEntry = {
      matchId: match.id,
      matchLabel: `${match.teamA} vs ${match.teamB}`,
      teamId: winnerTicker,
      teamName,
      tokensBurned: tokensBurned.trim(),
      txUrl: safeUrl,
      timestamp: Date.now(),
    };
    ui.requestConfirm(`Log buyback for ${winnerTicker}?`, async () => {
      let existing: BuybackEntry[] = [];
      try {
        const res = await fetch("/api/buyback-history", { cache: "no-store" });
        if (res.ok) {
          const data = (await res.json()) as { entries?: BuybackEntry[] };
          existing = Array.isArray(data.entries) ? data.entries : [];
        }
      } catch {
        /* fall back to empty list */
      }
      const { ok, status } = await saveKv("buyback_history", [
        entry,
        ...existing,
      ]);
      if (ok) {
        ui.showToast("success", "Buyback logged");
        setTokensBurned("");
        setTxUrl("");
        // The match is now fully handled; refresh so it leaves the list.
        onLogged();
      } else {
        onWriteError(ui, status, "Failed to log buyback");
      }
    });
  };

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-green-200 bg-green-50/60 p-3">
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-green-700">
        <Icon name="fire" size={13} className="text-orange-500" />
        Log Buyback
      </span>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={tokensBurned}
          onChange={(e) => setTokensBurned(e.target.value)}
          placeholder="Tokens burned (e.g. 1.2M)"
          className={`${input} flex-1`}
        />
        <input
          value={txUrl}
          onChange={(e) => setTxUrl(e.target.value)}
          placeholder="Solscan tx URL"
          className={`${input} flex-1`}
        />
        <button onClick={log} className={btnPrimary}>
          Log Buyback
        </button>
      </div>
    </div>
  );
}

function ResultsSection({
  ui,
  results,
  reload,
}: {
  ui: AdminUI;
  results: MatchResult[];
  reload: () => void;
}) {
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const { entries: buybacks, reload: reloadBuybacks } = useBuybackHistory();

  const draftFor = (id: string): Draft => drafts[id] ?? EMPTY_DRAFT;
  const patch = (id: string, p: Partial<Draft>) =>
    setDrafts((prev) => ({ ...prev, [id]: { ...draftFor(id), ...p } }));

  // Link by stable matchId, not team pair: knockout fixtures use placeholder
  // names and two teams can meet twice, both of which break pair matching.
  const resultFor = (m: ScheduledMatch) =>
    results.find((r) => r.matchId === m.id);

  // A decisive result still needs its buyback logged before it's "done"; a draw
  // never has one. Treat the buyback as recorded if the result carries a tx URL
  // or a matching entry exists in the public buyback feed.
  const buybackLogged = (r: MatchResult): boolean =>
    r.isDraw ||
    r.buybackTxUrl !== null ||
    buybacks.some((b) => b.matchId === r.matchId);

  // Matches the admin can act on right now, soonest kickoff first:
  //  - every match scheduled today (so upcoming games are visible to record),
  //  - any already-kicked-off match with no result yet (catch-up: late games
  //    roll into the next UTC day and must stay recordable, never vanish),
  //  - a recorded win whose buyback isn't logged yet, so the Log Buyback form
  //    stays reachable for a couple of days.
  // A fully-handled match (result in, and buyback logged or it's a draw) drops
  // off entirely — the panel shouldn't keep nagging about finished work.
  const RECORDED_WINDOW_MS = 72 * 60 * 60 * 1000;
  const now = Date.now();
  const today = new Date().toISOString().slice(0, 10);
  const pending = SCHEDULE.filter((m) => {
    const r = resultFor(m);
    if (r) {
      if (buybackLogged(r)) return false; // done — hide it
      return now - getKickoffMs(m) <= RECORDED_WINDOW_MS; // win awaiting buyback
    }
    return m.date === today || getKickoffMs(m) <= now;
  }).sort((a, b) => getKickoffMs(a) - getKickoffMs(b));

  const submit = (m: ScheduledMatch) => {
    const d = draftFor(m.id);
    const resolved = isResolvedFixture(m);

    let winner: string;
    let loser: string;
    let isDraw: boolean;

    if (resolved) {
      if (!d.outcome) {
        ui.showToast("error", "Pick an outcome first");
        return;
      }
      isDraw = d.outcome === "draw";
      winner = d.outcome === "B" ? m.teamB : m.teamA;
      loser = d.outcome === "B" ? m.teamA : m.teamB;
    } else {
      // Knockout fixture: the admin names the two real teams. Knockouts always
      // produce a winner (extra time / penalties), so there's no draw option.
      if (!d.koWinner || !d.koLoser) {
        ui.showToast("error", "Pick the winning and losing team");
        return;
      }
      if (d.koWinner === d.koLoser) {
        ui.showToast("error", "Winner and loser must differ");
        return;
      }
      winner = d.koWinner;
      loser = d.koLoser;
      isDraw = false;
    }

    // If the admin marks the buyback done, a valid URL is required — don't let a
    // ticked "Buyback done" silently save with no proof link. A result with no
    // buyback at all is still fine (draws, or record now and log the burn later).
    let buybackTxUrl: string | null = null;
    if (d.buybackDone) {
      const safe = safeHttpUrl(d.buybackUrl);
      if (!safe) {
        ui.showToast(
          "error",
          "Enter a valid buyback URL, or untick Buyback done",
        );
        return;
      }
      buybackTxUrl = safe;
    }

    const payload: MatchResult = {
      matchId: m.id,
      winner,
      loser,
      isDraw,
      timestamp: Date.now(),
      buybackTxUrl,
    };
    ui.requestConfirm(`Submit result for ${m.id}?`, async () => {
      const { ok, status } = await postJson("/api/admin/result", payload);
      if (ok) {
        ui.showToast("success", "Result saved");
        reload();
      } else {
        onWriteError(ui, status, "Failed to save result");
      }
    });
  };

  return (
    <Panel n={1} title="Submit Match Result">
      {pending.length === 0 ? (
        <p className="text-sm text-slate-400">No matches to record yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {pending.map((m) => {
            const existing = resultFor(m);
            const d = draftFor(m.id);
            if (existing) {
              return (
                <div key={m.id} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm opacity-70">
                    <span className="text-slate-600">
                      {/* Show the real teams from the result — for knockouts the
                          fixture's own teamA/teamB are placeholders. */}
                      {flag(existing.winner)} {existing.winner} vs{" "}
                      {flag(existing.loser)} {existing.loser}
                    </span>
                    <span className="font-semibold text-green-600">
                      {existing.isDraw ? "Draw" : `${existing.winner} won`}
                    </span>
                  </div>
                  {!existing.isDraw && (
                    <LogBuybackForm
                      ui={ui}
                      match={m}
                      winnerTicker={existing.winner}
                      onLogged={reloadBuybacks}
                    />
                  )}
                </div>
              );
            }
            return (
              <div
                key={m.id}
                className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3"
              >
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-semibold text-slate-900">
                    {flag(m.teamA)} {m.teamA} vs {flag(m.teamB)} {m.teamB}
                  </span>
                  <span className="text-xs text-slate-400">
                    {m.groupOrRound} · {m.time} · {m.venue}
                  </span>
                </div>
                {isResolvedFixture(m) ? (
                  <div className="flex flex-wrap gap-3 text-sm text-slate-700">
                    {(
                      [
                        ["A", `${m.teamA} wins`],
                        ["B", `${m.teamB} wins`],
                        ["draw", "Draw"],
                      ] as const
                    ).map(([val, label]) => (
                      <label key={val} className="flex items-center gap-1.5">
                        <input
                          type="radio"
                          name={`outcome-${m.id}`}
                          checked={d.outcome === val}
                          onChange={() => patch(m.id, { outcome: val })}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                ) : (
                  // Knockout fixture: name the two real teams (no draw — these
                  // are settled in extra time / penalties).
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <div className="flex-1">
                      <TeamSelect
                        teams={TEAMS_BY_NAME}
                        value={d.koWinner}
                        onChange={(t) => patch(m.id, { koWinner: t })}
                        placeholder="Winner…"
                      />
                    </div>
                    <div className="flex-1">
                      <TeamSelect
                        teams={TEAMS_BY_NAME}
                        value={d.koLoser}
                        onChange={(t) => patch(m.id, { koLoser: t })}
                        placeholder="Loser…"
                      />
                    </div>
                  </div>
                )}
                <label className="flex items-center gap-1.5 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={d.buybackDone}
                    onChange={(e) => patch(m.id, { buybackDone: e.target.checked })}
                  />
                  Buyback done
                </label>
                {d.buybackDone && (
                  <input
                    value={d.buybackUrl}
                    onChange={(e) => patch(m.id, { buybackUrl: e.target.value })}
                    placeholder="Buyback Solscan URL"
                    className={input}
                  />
                )}
                <div>
                  <button onClick={() => submit(m)} className={btnPrimary}>
                    Submit
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

// ── Section 3: Token Addresses ───────────────────────────────────────────────

interface TokenEdit {
  address: string;
  meteoraUrl: string;
  axiomUrl: string;
}

function TokenAddressSection({ ui }: { ui: AdminUI }) {
  const [edits, setEdits] = useState<Record<string, TokenEdit>>(() =>
    Object.fromEntries(
      ALL_TOKENS.map((t) => [
        t.ticker,
        {
          address: t.address ?? "",
          meteoraUrl: t.meteoraUrl ?? "",
          axiomUrl: t.axiomUrl ?? "",
        },
      ]),
    ),
  );

  const patch = (ticker: string, p: Partial<TokenEdit>) =>
    setEdits((prev) => ({ ...prev, [ticker]: { ...prev[ticker], ...p } }));

  const save = () => {
    ui.requestConfirm("Save token addresses to the live site?", async () => {
      const value: Record<string, TokenEdit> = {};
      for (const [ticker, edit] of Object.entries(edits)) {
        value[ticker] = {
          address: edit.address.trim(),
          meteoraUrl: edit.meteoraUrl.trim(),
          axiomUrl: edit.axiomUrl.trim(),
        };
      }
      const { ok, status } = await saveKv("token_addresses", value);
      if (ok) ui.showToast("success", "Saved");
      else onWriteError(ui, status, "Failed to save addresses");
    });
  };

  return (
    <Panel n={2} title="Token Addresses">
      <p className="text-xs text-slate-400">
        Changes here update the site without redeploying.
      </p>
      <div className="max-h-[420px] overflow-auto rounded-lg border border-slate-200">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="sticky top-0 bg-slate-50">
            <tr className="text-[11px] uppercase tracking-wider text-slate-400">
              <th className="px-3 py-2 font-medium">Ticker</th>
              <th className="px-3 py-2 font-medium">Address</th>
              <th className="px-3 py-2 font-medium">Meteora URL</th>
              <th className="px-3 py-2 font-medium">Axiom URL</th>
            </tr>
          </thead>
          <tbody>
            {ALL_TOKENS.map((t) => {
              const e = edits[t.ticker];
              return (
                <tr key={t.ticker} className="border-t border-slate-100">
                  <td className="px-3 py-1.5 font-mono text-slate-700">
                    ${t.ticker}
                  </td>
                  <td className="px-3 py-1.5">
                    <input
                      value={e.address}
                      onChange={(ev) =>
                        patch(t.ticker, { address: ev.target.value })
                      }
                      placeholder="mint address"
                      className={`${input} w-full`}
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <input
                      value={e.meteoraUrl}
                      onChange={(ev) =>
                        patch(t.ticker, { meteoraUrl: ev.target.value })
                      }
                      placeholder="https://meteora.ag/…"
                      className={`${input} w-full`}
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <input
                      value={e.axiomUrl}
                      onChange={(ev) =>
                        patch(t.ticker, { axiomUrl: ev.target.value })
                      }
                      placeholder="https://axiom.trade/…"
                      className={`${input} w-full`}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div>
        <button onClick={save} className={btnPrimary}>
          Save
        </button>
      </div>
    </Panel>
  );
}

// ── Section 4: Champion + Prize Distribution ─────────────────────────────────

function ChampionSection({
  ui,
  results,
  champion,
  balanceSOL,
  reload,
}: {
  ui: AdminUI;
  results: MatchResult[];
  champion: string | null;
  balanceSOL: number | null;
  reload: () => void;
}) {
  const statuses = useMemo(
    () => deriveTeamStatuses(results, champion),
    [results, champion],
  );
  const activeTeams = useMemo(
    () =>
      TEAMS.filter((t) => statuses.get(t.ticker) !== "eliminated").sort((a, b) =>
        a.name.localeCompare(b.name),
      ),
    [statuses],
  );

  const [pick, setPick] = useState(champion ?? "");
  const championTeam = champion ? TEAM_BY_TICKER.get(champion) : undefined;
  const [mint, setMint] = useState(championTeam?.tokenAddress ?? "");

  const [holders, setHolders] = useState<HolderRow[] | null>(null);
  const [snapshotting, setSnapshotting] = useState(false);

  const setChampion = () => {
    if (!pick) {
      ui.showToast("error", "Pick a team");
      return;
    }
    ui.requestConfirm(`Crown ${pick} as champion?`, async () => {
      const { ok, status } = await saveKv("champion", pick);
      if (ok) {
        ui.showToast("success", "Champion set");
        reload();
      } else {
        onWriteError(ui, status, "Failed to set champion");
      }
    });
  };

  const runSnapshot = async () => {
    if (!mint.trim()) {
      ui.showToast("error", "Enter a mint address");
      return;
    }
    setSnapshotting(true);
    try {
      const rows = await runHolderSnapshot(mint.trim(), balanceSOL);
      setHolders(rows);
      ui.showToast("success", `${rows.length} holders`);
    } catch {
      ui.showToast("error", "Snapshot failed");
    } finally {
      setSnapshotting(false);
    }
  };

  const exportCsv = () => {
    if (!holders) return;
    downloadCsv("holder-snapshot.csv", holderSnapshotCsv(holders));
  };

  return (
    <Panel n={3} title="Champion + Prize Distribution">
      {/* Set champion */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
        <div className="flex-1">
          <TeamSelect
            teams={activeTeams}
            value={pick}
            onChange={setPick}
            placeholder="Select champion…"
          />
        </div>
        <button onClick={setChampion} className={btnPrimary}>
          Set Champion
        </button>
      </div>

      {/* Snapshot */}
      <div className="flex flex-col gap-2 border-t border-slate-100 pt-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Snapshot Holders
        </span>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={mint}
            onChange={(e) => setMint(e.target.value)}
            placeholder="Champion token mint address"
            className={`${input} flex-1`}
          />
          <button
            onClick={runSnapshot}
            disabled={snapshotting}
            className={btnPrimary}
          >
            {snapshotting ? "Running…" : "Run Snapshot"}
          </button>
        </div>

        {holders && (
          <>
            <div className="mt-2 max-h-[320px] overflow-auto rounded-lg border border-slate-200">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="sticky top-0 bg-slate-50">
                  <tr className="text-[11px] uppercase tracking-wider text-slate-400">
                    <th className="px-3 py-2 font-medium">#</th>
                    <th className="px-3 py-2 font-medium">Wallet</th>
                    <th className="px-3 py-2 text-right font-medium">Tokens</th>
                    <th className="px-3 py-2 text-right font-medium">Share</th>
                    <th className="px-3 py-2 text-right font-medium">
                      Est. SOL
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {holders.map((h, i) => (
                    <tr key={h.address} className="border-t border-slate-100">
                      <td className="px-3 py-1.5 font-mono text-slate-400">
                        {i + 1}
                      </td>
                      <td className="px-3 py-1.5 font-mono text-xs text-slate-600">
                        {h.address.slice(0, 6)}…{h.address.slice(-6)}
                      </td>
                      <td className="px-3 py-1.5 text-right font-mono tabular-nums text-slate-700">
                        {h.uiAmount.toLocaleString("en-US", {
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-3 py-1.5 text-right font-mono tabular-nums text-slate-500">
                        {(h.share * 100).toFixed(2)}%
                      </td>
                      <td className="px-3 py-1.5 text-right font-mono tabular-nums text-green-600">
                        {h.estSol !== null ? h.estSol.toFixed(3) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between gap-2">
              <button onClick={exportCsv} className={btnGhost}>
                Download CSV
              </button>
              <span className="text-xs text-slate-400">
                Distribute SOL manually using the Jupiter airdrop tool.
              </span>
            </div>
          </>
        )}
      </div>
    </Panel>
  );
}

// ── Section 5: Announcement Banner ───────────────────────────────────────────

function AnnouncementSection({
  ui,
  featured,
  reload,
}: {
  ui: AdminUI;
  featured: { announcement: string | null };
  reload: () => void;
}) {
  const [text, setText] = useState(featured.announcement ?? "");

  const publish = () => {
    ui.requestConfirm("Publish this announcement site-wide?", async () => {
      const { ok, status } = await saveKv("featured_announcement", text);
      if (ok) {
        ui.showToast("success", "Published");
        reload();
      } else {
        onWriteError(ui, status, "Failed to publish");
      }
    });
  };
  const clear = () => {
    ui.requestConfirm("Remove the site-wide announcement?", async () => {
      const { ok, status } = await saveKv("featured_announcement", null);
      if (ok) {
        ui.showToast("success", "Cleared");
        setText("");
        reload();
      } else {
        onWriteError(ui, status, "Failed to clear");
      }
    });
  };

  return (
    <Panel n={4} title="Announcement Banner">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder="Site-wide announcement…"
        className={`${input} resize-y`}
      />
      <div className="flex gap-2">
        <button onClick={publish} className={btnPrimary}>
          Publish
        </button>
        <button onClick={clear} className={btnDanger}>
          Clear
        </button>
      </div>
    </Panel>
  );
}

// ── Section 6: Weekly Prize ──────────────────────────────────────────────────

function HoldersTable({ holders }: { holders: HolderRow[] }) {
  return (
    <div className="mt-2 max-h-[320px] overflow-auto rounded-lg border border-slate-200">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead className="sticky top-0 bg-slate-50">
          <tr className="text-[11px] uppercase tracking-wider text-slate-400">
            <th className="px-3 py-2 font-medium">#</th>
            <th className="px-3 py-2 font-medium">Wallet</th>
            <th className="px-3 py-2 text-right font-medium">Tokens</th>
            <th className="px-3 py-2 text-right font-medium">Share</th>
            <th className="px-3 py-2 text-right font-medium">Est. SOL</th>
          </tr>
        </thead>
        <tbody>
          {holders.map((h, i) => (
            <tr key={h.address} className="border-t border-slate-100">
              <td className="px-3 py-1.5 font-mono text-slate-400">{i + 1}</td>
              <td className="px-3 py-1.5 font-mono text-xs text-slate-600">
                {h.address.slice(0, 6)}…{h.address.slice(-6)}
              </td>
              <td className="px-3 py-1.5 text-right font-mono tabular-nums text-slate-700">
                {h.uiAmount.toLocaleString("en-US", {
                  maximumFractionDigits: 2,
                })}
              </td>
              <td className="px-3 py-1.5 text-right font-mono tabular-nums text-slate-500">
                {(h.share * 100).toFixed(2)}%
              </td>
              <td className="px-3 py-1.5 text-right font-mono tabular-nums text-green-600">
                {h.estSol !== null ? h.estSol.toFixed(3) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WeeklySection({
  ui,
  results,
}: {
  ui: AdminUI;
  results: MatchResult[];
}) {
  const { current, history, reload } = useWeeklyPrize();
  const { teams: liveTeams } = useTokenAddresses();

  const [selectedId, setSelectedId] = useState("");
  const [potDraft, setPotDraft] = useState("");
  const [mint, setMint] = useState("");
  const [txHash, setTxHash] = useState("");
  const [holders, setHolders] = useState<HolderRow[] | null>(null);
  const [snapshotting, setSnapshotting] = useState(false);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 1_000);
    return () => clearInterval(id);
  }, []);

  const match = current
    ? SCHEDULE.find((m) => m.id === current.matchId)
    : undefined;
  const result = current
    ? results.find((r) => r.matchId === current.matchId)
    : undefined;
  const winnerTicker = result && !result.isDraw ? result.winner : null;
  const winnerTeam = winnerTicker ? TEAM_BY_TICKER.get(winnerTicker) : undefined;

  // Default the snapshot mint to the winning team's live address.
  useEffect(() => {
    if (!winnerTicker) return;
    const live = liveTeams.find((t) => t.ticker === winnerTicker);
    setMint(live?.tokenAddress ?? winnerTeam?.tokenAddress ?? "");
  }, [winnerTicker, liveTeams, winnerTeam]);

  const nextWeek = useMemo(
    () =>
      Math.max(0, current?.week ?? 0, ...history.map((h) => h.week)) + 1,
    [current, history],
  );

  const setWeekly = () => {
    if (!selectedId) {
      ui.showToast("error", "Select a match first");
      return;
    }
    const pot = Number(potDraft);
    if (!Number.isFinite(pot) || pot <= 0) {
      ui.showToast("error", "Enter a valid SOL pot");
      return;
    }
    ui.requestConfirm(`Set week ${nextWeek} prize on ${selectedId}?`, async () => {
      // Archive the outgoing week before overwriting it.
      if (current) {
        const { ok: okHist, status: archiveStatus } = await saveKv(
          "weekly_prize_history",
          [...history, current],
        );
        if (!okHist) {
          onWriteError(ui, archiveStatus, "Failed to archive previous week");
          return;
        }
      }
      const prize: WeeklyPrize = {
        matchId: selectedId,
        potSol: pot,
        status: "upcoming",
        winnerTeamId: null,
        txHash: null,
        week: nextWeek,
      };
      const { ok, status } = await saveKv("weekly_prize", prize);
      if (ok) {
        ui.showToast("success", "Weekly prize set");
        setSelectedId("");
        setPotDraft("");
        setHolders(null);
        reload();
      } else {
        onWriteError(ui, status, "Failed to set weekly prize");
      }
    });
  };

  const runSnapshot = async () => {
    if (!current) return;
    if (!mint.trim()) {
      ui.showToast("error", "Enter a mint address");
      return;
    }
    setSnapshotting(true);
    try {
      const rows = await runHolderSnapshot(mint.trim(), current.potSol);
      setHolders(rows);
      ui.showToast("success", `${rows.length} holders`);
      // Mark the snapshot as ready and record the winner.
      const { ok, status } = await saveKv("weekly_prize", {
        ...current,
        status: "snapshot_ready",
        winnerTeamId: winnerTicker,
      } satisfies WeeklyPrize);
      if (!ok) onWriteError(ui, status, "Failed to save snapshot status");
      reload();
    } catch {
      ui.showToast("error", "Snapshot failed");
    } finally {
      setSnapshotting(false);
    }
  };

  const exportCsv = () => {
    if (holders) downloadCsv("weekly-prize-snapshot.csv", holderSnapshotCsv(holders));
  };

  const markPaid = () => {
    if (!current) return;
    if (!txHash.trim()) {
      ui.showToast("error", "Enter the payout tx hash");
      return;
    }
    ui.requestConfirm("Mark this week's prize as paid?", async () => {
      const { ok, status } = await saveKv("weekly_prize", {
        ...current,
        status: "paid",
        txHash: txHash.trim(),
        winnerTeamId: winnerTicker ?? current.winnerTeamId,
      } satisfies WeeklyPrize);
      if (ok) {
        ui.showToast("success", "Marked paid");
        setTxHash("");
        reload();
      } else {
        onWriteError(ui, status, "Failed to mark paid");
      }
    });
  };

  const rollOver = () => {
    if (!current) return;
    ui.requestConfirm(
      `Roll ${current.potSol} SOL over to next week?`,
      async () => {
        const { ok: okHist, status: archiveStatus } = await saveKv(
          "weekly_prize_history",
          [...history, current],
        );
        if (!okHist) {
          onWriteError(ui, archiveStatus, "Failed to archive");
          return;
        }
        const { ok: okClear, status: clearStatus } = await saveKv(
          "weekly_prize",
          null,
        );
        if (okClear) {
          ui.showToast("success", "Pot carried to next week");
          setPotDraft(String(current.potSol));
          setHolders(null);
          reload();
        } else {
          onWriteError(ui, clearStatus, "Failed to roll over");
        }
      },
    );
  };

  return (
    <Panel n={5} title="Weekly Prize">
      {/* Current week status */}
      {current && match && (
        <div className="flex flex-col gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-semibold text-slate-800">
              Week {current.week}: {flag(match.teamA)} {match.teamA} vs{" "}
              {flag(match.teamB)} {match.teamB}
            </span>
            <span className="font-bold tabular-nums text-green-700">
              {current.potSol} SOL
            </span>
          </div>
          <span className="text-xs text-slate-500">
            {match.date} {match.time} · {match.groupOrRound} ·{" "}
            <span className="font-medium uppercase tracking-wide">
              {current.status.replace("_", " ")}
            </span>
            {!result && now !== null && (
              <>
                {" · in "}
                <span className="tabular-nums">
                  {formatCountdownPrecise(getKickoffMs(match) - now)}
                </span>
              </>
            )}
          </span>
        </div>
      )}

      {/* After-match actions */}
      {current && result && (
        <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3">
          {result.isDraw ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-semibold text-amber-600">
                Draw, pot rolls to next week.
              </span>
              <button onClick={rollOver} className={btnPrimary}>
                Roll Over
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-1.5 text-sm">
                <span className="text-slate-400">Winner:</span>
                <span className="font-semibold text-slate-900">
                  {winnerTeam
                    ? `${flag(winnerTeam.ticker)} ${winnerTeam.name}`
                    : winnerTicker}
                </span>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  value={mint}
                  onChange={(e) => setMint(e.target.value)}
                  placeholder="Winning token mint address"
                  className={`${input} flex-1`}
                />
                <button
                  onClick={runSnapshot}
                  disabled={snapshotting}
                  className={btnPrimary}
                >
                  {snapshotting ? "Running…" : "Run Snapshot"}
                </button>
              </div>

              {holders && (
                <>
                  <HoldersTable holders={holders} />
                  <div>
                    <button onClick={exportCsv} className={btnGhost}>
                      Download CSV
                    </button>
                  </div>
                </>
              )}

              <div className="flex flex-col gap-2 border-t border-slate-100 pt-3 sm:flex-row">
                <input
                  value={txHash}
                  onChange={(e) => setTxHash(e.target.value)}
                  placeholder="Payout tx hash"
                  className={`${input} flex-1`}
                />
                <button onClick={markPaid} className={btnPrimary}>
                  Mark as Paid
                </button>
              </div>
              {current.status === "paid" && current.txHash && (
                <span className="text-xs text-green-600">
                  Paid · {current.txHash.slice(0, 8)}…
                </span>
              )}
            </>
          )}
        </div>
      )}

      {/* Set this week's prize */}
      <div className="flex flex-col gap-2 border-t border-slate-100 pt-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Set Week {nextWeek} Prize
        </span>
        <MatchSelect
          matches={SCHEDULE}
          value={selectedId}
          onChange={setSelectedId}
        />
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={potDraft}
            onChange={(e) => setPotDraft(e.target.value)}
            inputMode="decimal"
            placeholder="Prize pot in SOL"
            className={`${input} flex-1`}
          />
          <button onClick={setWeekly} className={btnPrimary}>
            Set Weekly Prize
          </button>
        </div>
      </div>

      {/* Past weeks */}
      {history.length > 0 && (
        <div className="flex flex-col gap-1 border-t border-slate-100 pt-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Past Weeks
          </span>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-left text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-slate-400">
                  <th className="py-1.5 pr-3 font-medium">Wk</th>
                  <th className="py-1.5 pr-3 font-medium">Match</th>
                  <th className="py-1.5 pr-3 font-medium">Winner</th>
                  <th className="py-1.5 pr-3 text-right font-medium">Pot</th>
                  <th className="py-1.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {[...history]
                  .sort((a, b) => b.week - a.week)
                  .map((h) => {
                    const m = SCHEDULE.find((s) => s.id === h.matchId);
                    const wt = h.winnerTeamId
                      ? TEAM_BY_TICKER.get(h.winnerTeamId)
                      : undefined;
                    return (
                      <tr key={h.week} className="border-t border-slate-100">
                        <td className="py-1.5 pr-3 tabular-nums text-slate-500">
                          {h.week}
                        </td>
                        <td className="py-1.5 pr-3 text-slate-700">
                          {m ? `${m.teamA} v ${m.teamB}` : h.matchId}
                        </td>
                        <td className="py-1.5 pr-3 text-slate-700">
                          {wt ? wt.name : "Rolled over"}
                        </td>
                        <td className="py-1.5 pr-3 text-right tabular-nums text-slate-700">
                          {h.potSol} SOL
                        </td>
                        <td className="py-1.5 text-slate-500">
                          {h.status.replace("_", " ")}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Panel>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const { results, champion, reload: reloadResults } = useMatchResults();
  const { balanceSOL } = usePrizePool();
  const { publicKey } = useWallet();

  const [toast, setToast] = useState<{ kind: ToastKind; message: string } | null>(
    null,
  );
  const [confirm, setConfirm] = useState<{
    message: string;
    action: () => void | Promise<void>;
  } | null>(null);

  const [featured, setFeatured] = useState<{
    announcement: string | null;
  }>({ announcement: null });

  const reloadFeatured = useCallback(async () => {
    try {
      const res = await fetch("/api/featured", { cache: "no-store" });
      if (!res.ok) return;
      const d = (await res.json()) as { announcement?: unknown };
      setFeatured({
        announcement: typeof d.announcement === "string" ? d.announcement : null,
      });
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void reloadFeatured();
  }, [reloadFeatured]);

  // Refresh everything the panels read after a write: the announcement banner
  // and the match results + champion. Submitting a result must re-pull results
  // so the saved win shows immediately (and unlocks the Log Buyback form).
  const reloadAll = useCallback(() => {
    void reloadFeatured();
    reloadResults();
  }, [reloadFeatured, reloadResults]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(id);
  }, [toast]);

  const ui: AdminUI = {
    showToast: (kind, message) => setToast({ kind, message }),
    requestConfirm: (message, action) => setConfirm({ message, action }),
  };

  // Clear this browser's admin cookie, then bounce to the login page (the
  // middleware would redirect there anyway once the cookie is gone).
  const logout = async () => {
    try {
      await fetch("/api/admin/logout", {
        method: "POST",
        credentials: "same-origin",
      });
    } finally {
      window.location.href = "/admin/login";
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold uppercase tracking-tight text-slate-900">
          Control Panel
        </h1>
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-slate-400">
            {publicKey
              ? `Connected: ${publicKey.toBase58().slice(0, 4)}…${publicKey
                  .toBase58()
                  .slice(-4)}`
              : "Wallet not connected"}
          </span>
          <button onClick={logout} className={btnGhost}>
            Log out
          </button>
        </div>
      </header>

      <ResultsSection ui={ui} results={results} reload={reloadAll} />
      <TokenAddressSection ui={ui} />
      <ChampionSection
        ui={ui}
        results={results}
        champion={champion}
        balanceSOL={balanceSOL}
        reload={reloadAll}
      />
      <AnnouncementSection ui={ui} featured={featured} reload={reloadFeatured} />
      <WeeklySection ui={ui} results={results} />

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-lg ${
            toast.kind === "success"
              ? "bg-green-600 text-white"
              : "bg-red-500 text-white"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Confirm modal */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-card-md">
            <p className="text-sm text-slate-700">{confirm.message}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setConfirm(null)} className={btnGhost}>
                Cancel
              </button>
              <button
                onClick={async () => {
                  const action = confirm.action;
                  setConfirm(null);
                  await action();
                }}
                className={btnPrimary}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
