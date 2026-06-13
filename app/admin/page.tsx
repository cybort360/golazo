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
  // Group fixtures: goals for teamA / teamB. The outcome (win/draw/loss) is
  // derived from the score, which also feeds the goal-difference tiebreaker.
  scoreA: string;
  scoreB: string;
  // Knockout fixtures carry placeholder participants ("Winner Match 73"), so the
  // admin picks the two real teams here, plus an optional score.
  koWinner: string;
  koLoser: string;
  koWinnerGoals: string;
  koLoserGoals: string;
}
const EMPTY_DRAFT: Draft = {
  scoreA: "",
  scoreB: "",
  koWinner: "",
  koLoser: "",
  koWinnerGoals: "",
  koLoserGoals: "",
};

// A fixture is "resolved" once both participants are real team tickers. Group
// matches always are; knockout fixtures aren't until the admin names the teams.
const TEAMS_BY_NAME = [...TEAMS].sort((a, b) => a.name.localeCompare(b.name));
function isResolvedFixture(m: ScheduledMatch): boolean {
  return TEAM_BY_TICKER.has(m.teamA) && TEAM_BY_TICKER.has(m.teamB);
}

// Standalone buyback log. The on-chain burn is a manual wallet action, recorded
// here independently of match results: pick the match, the team whose token was
// bought back, the amount, and the Solscan tx. Re-logging a match replaces its
// entry rather than stacking a duplicate in the public feed.
function BuybackSection({
  ui,
  results,
}: {
  ui: AdminUI;
  results: MatchResult[];
}) {
  const { reload } = useBuybackHistory();
  const [matchId, setMatchId] = useState("");
  const [teamId, setTeamId] = useState("");
  const [tokensBurned, setTokensBurned] = useState("");
  const [txUrl, setTxUrl] = useState("");

  const match = SCHEDULE.find((m) => m.id === matchId) ?? null;
  const result = match
    ? results.find((r) => r.matchId === match.id)
    : undefined;

  // Default the team to the match's recorded winner once one is known.
  useEffect(() => {
    if (result && !result.isDraw) setTeamId(result.winner);
  }, [result]);

  const log = () => {
    if (!match) {
      ui.showToast("error", "Pick a match");
      return;
    }
    if (!teamId) {
      ui.showToast("error", "Pick the team bought back");
      return;
    }
    if (!tokensBurned.trim() || !txUrl.trim()) {
      ui.showToast("error", "Enter tokens burned and the tx URL");
      return;
    }
    const safeUrl = safeHttpUrl(txUrl);
    if (!safeUrl) {
      ui.showToast("error", "Enter a valid http(s) tx URL");
      return;
    }
    const teamName = TEAM_BY_TICKER.get(teamId)?.name ?? teamId;
    const entry: BuybackEntry = {
      matchId: match.id,
      matchLabel: `${match.teamA} vs ${match.teamB}`,
      teamId,
      teamName,
      tokensBurned: tokensBurned.trim(),
      txUrl: safeUrl,
      timestamp: Date.now(),
    };
    ui.requestConfirm(`Log buyback for ${teamId}?`, async () => {
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
      const deduped = existing.filter((b) => b.matchId !== entry.matchId);
      const { ok, status } = await saveKv("buyback_history", [
        entry,
        ...deduped,
      ]);
      if (ok) {
        ui.showToast("success", "Buyback logged");
        setTokensBurned("");
        setTxUrl("");
        reload();
      } else {
        onWriteError(ui, status, "Failed to log buyback");
      }
    });
  };

  return (
    <Panel n={6} title="Log Buyback">
      <p className="text-xs text-slate-400">
        Record an on-chain token burn. Buybacks are tracked separately from
        results — log one whenever you run the burn from the buyback wallet.
      </p>
      <div className="flex flex-col gap-3">
        <MatchSelect matches={SCHEDULE} value={matchId} onChange={setMatchId} />
        <TeamSelect
          teams={TEAMS_BY_NAME}
          value={teamId}
          onChange={setTeamId}
          placeholder="Team bought back…"
        />
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
        </div>
        <div>
          <button onClick={log} className={btnPrimary}>
            Log Buyback
          </button>
        </div>
      </div>
    </Panel>
  );
}

interface LiveSyncStatus {
  fetchedAt: number;
  unmapped: number;
}

function sourceLabel(r: MatchResult): string {
  // Older records predate the source field and were all entered by hand.
  return r.source === "api" ? "Auto" : "Manual";
}

function LiveSyncLine({ status }: { status: LiveSyncStatus | null }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 10_000);
    return () => clearInterval(id);
  }, []);

  if (!status || !status.fetchedAt) {
    return (
      <p className="text-xs text-slate-400">
        Live feed: no recent fetch (idle outside match windows, or token not set).
      </p>
    );
  }
  const ageS =
    now === null ? null : Math.max(0, Math.round((now - status.fetchedAt) / 1000));
  return (
    <p className="text-xs text-slate-400">
      Live feed: updated{" "}
      <span suppressHydrationWarning className="tabular-nums">
        {ageS === null ? "…" : `${ageS}s ago`}
      </span>
      {status.unmapped > 0 && (
        <span className="ml-1 font-semibold text-amber-600">
          · {status.unmapped} unmapped (record manually)
        </span>
      )}
    </p>
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
  const [sync, setSync] = useState<LiveSyncStatus | null>(null);

  const draftFor = (id: string): Draft => drafts[id] ?? EMPTY_DRAFT;
  const patch = (id: string, p: Partial<Draft>) =>
    setDrafts((prev) => ({ ...prev, [id]: { ...draftFor(id), ...p } }));

  const resultFor = (m: ScheduledMatch) =>
    results.find((r) => r.matchId === m.id);

  // Poll the live-sync status so the operator can see the feed is healthy and
  // spot any fixtures it couldn't map (which then need a manual entry below).
  useEffect(() => {
    let cancelled = false;
    const load = () =>
      fetch("/api/live", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d: { fetchedAt?: number; unmapped?: number } | null) => {
          if (cancelled || !d) return;
          setSync({ fetchedAt: d.fetchedAt ?? 0, unmapped: d.unmapped ?? 0 });
        })
        .catch(() => {});
    void load();
    const id = setInterval(() => void load(), 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // Seed a draft from an existing result so the override form shows the current
  // score. Only seed fixtures not already being edited, so a syncing API result
  // can't yank a value out from under the operator mid-edit.
  useEffect(() => {
    setDrafts((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const r of results) {
        if (next[r.matchId]) continue;
        const m = SCHEDULE.find((x) => x.id === r.matchId);
        if (!m) continue;
        if (isResolvedFixture(m)) {
          const aIsWinner = r.winner === m.teamA;
          const gA = aIsWinner ? r.goalsWinner : r.goalsLoser;
          const gB = aIsWinner ? r.goalsLoser : r.goalsWinner;
          next[r.matchId] = {
            ...EMPTY_DRAFT,
            scoreA: gA != null ? String(gA) : "",
            scoreB: gB != null ? String(gB) : "",
          };
        } else {
          next[r.matchId] = {
            ...EMPTY_DRAFT,
            koWinner: r.winner,
            koLoser: r.loser,
            koWinnerGoals: r.goalsWinner != null ? String(r.goalsWinner) : "",
            koLoserGoals: r.goalsLoser != null ? String(r.goalsLoser) : "",
          };
        }
        changed = true;
      }
      return changed ? next : prev;
    });
  }, [results]);

  // Fixtures worth showing: kicking off soon (next 24h) through recently played
  // (last 72h), so the operator can pre-fill, record, or correct an auto result.
  const WINDOW_FUTURE_MS = 24 * 60 * 60 * 1000;
  const WINDOW_PAST_MS = 72 * 60 * 60 * 1000;
  const now = Date.now();
  const shown = SCHEDULE.filter((m) => {
    const kickoff = getKickoffMs(m);
    return kickoff - WINDOW_FUTURE_MS <= now && now <= kickoff + WINDOW_PAST_MS;
  }).sort((a, b) => getKickoffMs(a) - getKickoffMs(b));

  const parseScore = (s: string): number | null => {
    if (s.trim() === "") return null;
    const n = Number(s);
    return Number.isInteger(n) && n >= 0 ? n : null;
  };

  const submit = (m: ScheduledMatch) => {
    const d = draftFor(m.id);
    let payload: MatchResult;

    if (isResolvedFixture(m)) {
      const a = parseScore(d.scoreA);
      const b = parseScore(d.scoreB);
      if (a === null || b === null) {
        ui.showToast("error", "Enter both scores (whole numbers)");
        return;
      }
      const isDraw = a === b;
      const aWins = a > b;
      const winner = aWins || isDraw ? m.teamA : m.teamB;
      const loser = aWins || isDraw ? m.teamB : m.teamA;
      payload = {
        matchId: m.id,
        winner,
        loser,
        isDraw,
        goalsWinner: winner === m.teamA ? a : b,
        goalsLoser: winner === m.teamA ? b : a,
        timestamp: Date.now(),
        source: "manual",
      };
    } else {
      // Knockout fixture: name the two real teams. No draw — settled in extra
      // time / penalties. Score is optional.
      if (!d.koWinner || !d.koLoser) {
        ui.showToast("error", "Pick the winning and losing team");
        return;
      }
      if (d.koWinner === d.koLoser) {
        ui.showToast("error", "Winner and loser must differ");
        return;
      }
      let goalsWinner: number | null = null;
      let goalsLoser: number | null = null;
      if (d.koWinnerGoals.trim() !== "" || d.koLoserGoals.trim() !== "") {
        goalsWinner = parseScore(d.koWinnerGoals);
        goalsLoser = parseScore(d.koLoserGoals);
        if (goalsWinner === null || goalsLoser === null) {
          ui.showToast("error", "Enter both knockout scores or leave both blank");
          return;
        }
      }
      payload = {
        matchId: m.id,
        winner: d.koWinner,
        loser: d.koLoser,
        isDraw: false,
        goalsWinner,
        goalsLoser,
        timestamp: Date.now(),
        source: "manual",
      };
    }

    ui.requestConfirm(`Save result for ${m.id}?`, async () => {
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
    <Panel n={1} title="Match Results (auto + override)">
      <LiveSyncLine status={sync} />
      {shown.length === 0 ? (
        <p className="text-sm text-slate-400">No matches in the recording window.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {shown.map((m) => {
            const existing = resultFor(m);
            const d = draftFor(m.id);
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

                {existing && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-semibold text-green-600">
                      {existing.isDraw
                        ? "Draw"
                        : `${flag(existing.winner)} ${existing.winner} won`}
                      {existing.goalsWinner != null &&
                        existing.goalsLoser != null && (
                          <span className="ml-1 tabular-nums text-slate-500">
                            ({existing.goalsWinner}–{existing.goalsLoser})
                          </span>
                        )}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        existing.source === "api"
                          ? "bg-blue-50 text-blue-600"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {sourceLabel(existing)}
                    </span>
                  </div>
                )}

                {isResolvedFixture(m) ? (
                  <div className="flex items-center gap-2 text-sm text-slate-700">
                    <span className="w-12 shrink-0 text-right">{m.teamA}</span>
                    <input
                      inputMode="numeric"
                      value={d.scoreA}
                      onChange={(e) => patch(m.id, { scoreA: e.target.value })}
                      placeholder="0"
                      className={`${input} w-16 text-center`}
                    />
                    <span className="text-slate-300">–</span>
                    <input
                      inputMode="numeric"
                      value={d.scoreB}
                      onChange={(e) => patch(m.id, { scoreB: e.target.value })}
                      placeholder="0"
                      className={`${input} w-16 text-center`}
                    />
                    <span className="w-12 shrink-0">{m.teamB}</span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
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
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <span className="text-xs">Score (optional)</span>
                      <input
                        inputMode="numeric"
                        value={d.koWinnerGoals}
                        onChange={(e) =>
                          patch(m.id, { koWinnerGoals: e.target.value })
                        }
                        placeholder="W"
                        className={`${input} w-16 text-center`}
                      />
                      <span className="text-slate-300">–</span>
                      <input
                        inputMode="numeric"
                        value={d.koLoserGoals}
                        onChange={(e) =>
                          patch(m.id, { koLoserGoals: e.target.value })
                        }
                        placeholder="L"
                        className={`${input} w-16 text-center`}
                      />
                    </div>
                  </div>
                )}

                <div>
                  <button onClick={() => submit(m)} className={btnPrimary}>
                    {existing ? "Override" : "Save"}
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
  // so the saved result shows immediately.
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
      <BuybackSection ui={ui} results={results} />

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
