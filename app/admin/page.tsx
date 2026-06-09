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
import { getTodaysMatches } from "@/lib/schedule";
import { deriveTeamStatuses } from "@/lib/standings";
import { useMatchResults, type MatchResult } from "@/hooks/useMatchResults";
import { usePrizePool } from "@/hooks/usePrizePool";
import TeamSelect from "@/components/TeamSelect";
import MatchSelect from "@/components/MatchSelect";

// ── Shared types & helpers ────────────────────────────────────────────────────

type ToastKind = "success" | "error";
interface Holder {
  address: string;
  uiAmount: number;
}
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

async function postJson(url: string, body: unknown): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function saveKv(key: string, value: unknown): Promise<boolean> {
  return postJson("/api/admin/kv", { key, value });
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

// ── Section 1 — Featured Match ────────────────────────────────────────────────

function FeaturedSection({
  ui,
  featured,
  reload,
}: {
  ui: AdminUI;
  featured: { matchId: string | null; announcement: string | null };
  reload: () => void;
}) {
  const [selectedId, setSelectedId] = useState("");

  const pinned = featured.matchId
    ? SCHEDULE.find((m) => m.id === featured.matchId)
    : undefined;

  const pin = () => {
    if (!selectedId) {
      ui.showToast("error", "Select a valid match first");
      return;
    }
    ui.requestConfirm(`Pin ${selectedId} to the homepage?`, async () => {
      const ok = await saveKv("featured_match_id", selectedId);
      ui.showToast(ok ? "success" : "error", ok ? "Match pinned" : "Failed to pin");
      if (ok) reload();
    });
  };

  const clear = () => {
    ui.requestConfirm("Remove the pinned featured match?", async () => {
      const ok = await saveKv("featured_match_id", null);
      ui.showToast(ok ? "success" : "error", ok ? "Cleared" : "Failed");
      if (ok) reload();
    });
  };

  return (
    <Panel n={1} title="Featured Match">
      {pinned && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm">
          <span className="text-slate-700">
            Pinned: {flag(pinned.teamA)} {pinned.teamA} vs {flag(pinned.teamB)}{" "}
            {pinned.teamB}{" "}
            <span className="text-slate-400">
              ({pinned.date} {pinned.time})
            </span>
          </span>
          <button onClick={clear} className={btnDanger}>
            Clear
          </button>
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
        <div className="flex-1">
          <MatchSelect
            matches={SCHEDULE}
            value={selectedId}
            onChange={setSelectedId}
          />
        </div>
        <button onClick={pin} className={btnPrimary}>
          Pin to Homepage
        </button>
      </div>
    </Panel>
  );
}

// ── Section 2 — Submit Match Result ───────────────────────────────────────────

interface Draft {
  outcome: "A" | "B" | "draw" | "";
  buybackDone: boolean;
  buybackUrl: string;
}
const EMPTY_DRAFT: Draft = { outcome: "", buybackDone: false, buybackUrl: "" };

function ResultsSection({
  ui,
  results,
  reload,
}: {
  ui: AdminUI;
  results: MatchResult[];
  reload: () => void;
}) {
  const todays = getTodaysMatches();
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});

  const draftFor = (id: string): Draft => drafts[id] ?? EMPTY_DRAFT;
  const patch = (id: string, p: Partial<Draft>) =>
    setDrafts((prev) => ({ ...prev, [id]: { ...draftFor(id), ...p } }));

  const resultFor = (m: ScheduledMatch) =>
    results.find(
      (r) =>
        (r.winner === m.teamA && r.loser === m.teamB) ||
        (r.winner === m.teamB && r.loser === m.teamA),
    );

  const submit = (m: ScheduledMatch) => {
    const d = draftFor(m.id);
    if (!d.outcome) {
      ui.showToast("error", "Pick an outcome first");
      return;
    }
    const isDraw = d.outcome === "draw";
    const winner = d.outcome === "B" ? m.teamB : m.teamA;
    const loser = d.outcome === "B" ? m.teamA : m.teamB;
    const payload: MatchResult = {
      matchId: m.id,
      winner,
      loser,
      isDraw,
      timestamp: Date.now(),
      buybackTxUrl: d.buybackDone && d.buybackUrl ? d.buybackUrl : null,
    };
    ui.requestConfirm(`Submit result for ${m.id}?`, async () => {
      const ok = await postJson("/api/admin/result", payload);
      ui.showToast(ok ? "success" : "error", ok ? "Result saved" : "Failed");
      if (ok) reload();
    });
  };

  return (
    <Panel n={2} title="Submit Match Result">
      {todays.length === 0 ? (
        <p className="text-sm text-slate-400">No matches scheduled today.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {todays.map((m) => {
            const existing = resultFor(m);
            const d = draftFor(m.id);
            if (existing) {
              return (
                <div
                  key={m.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm opacity-70"
                >
                  <span className="text-slate-600">
                    {flag(m.teamA)} {m.teamA} vs {flag(m.teamB)} {m.teamB}
                  </span>
                  <span className="font-semibold text-green-600">
                    {existing.isDraw ? "Draw" : `${existing.winner} won`}
                  </span>
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
                    {m.time} · {m.venue}
                  </span>
                </div>
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

// ── Section 3 — Token Addresses ───────────────────────────────────────────────

interface TokenEdit {
  address: string;
  pumpUrl: string;
  axiomUrl: string;
}

function TokenAddressSection({ ui }: { ui: AdminUI }) {
  const [edits, setEdits] = useState<Record<string, TokenEdit>>(() =>
    Object.fromEntries(
      ALL_TOKENS.map((t) => [
        t.ticker,
        {
          address: t.address ?? "",
          pumpUrl: t.pumpUrl ?? "",
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
          pumpUrl: edit.pumpUrl.trim(),
          axiomUrl: edit.axiomUrl.trim(),
        };
      }
      const ok = await saveKv("token_addresses", value);
      ui.showToast(ok ? "success" : "error", ok ? "Saved" : "Failed");
    });
  };

  return (
    <Panel n={3} title="Token Addresses">
      <p className="text-xs text-slate-400">
        Changes here update the site without redeploying.
      </p>
      <div className="max-h-[420px] overflow-auto rounded-lg border border-slate-200">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="sticky top-0 bg-slate-50">
            <tr className="text-[11px] uppercase tracking-wider text-slate-400">
              <th className="px-3 py-2 font-medium">Ticker</th>
              <th className="px-3 py-2 font-medium">Address</th>
              <th className="px-3 py-2 font-medium">pump.fun URL</th>
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
                      value={e.pumpUrl}
                      onChange={(ev) =>
                        patch(t.ticker, { pumpUrl: ev.target.value })
                      }
                      placeholder="https://pump.fun/…"
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

// ── Section 4 — Champion + Prize Distribution ─────────────────────────────────

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

  const [holders, setHolders] = useState<Holder[] | null>(null);
  const [snapshotting, setSnapshotting] = useState(false);

  const setChampion = () => {
    if (!pick) {
      ui.showToast("error", "Pick a team");
      return;
    }
    ui.requestConfirm(`Crown ${pick} as champion?`, async () => {
      const ok = await saveKv("champion", pick);
      ui.showToast(ok ? "success" : "error", ok ? "Champion set" : "Failed");
      if (ok) reload();
    });
  };

  const runSnapshot = async () => {
    if (!mint.trim()) {
      ui.showToast("error", "Enter a mint address");
      return;
    }
    setSnapshotting(true);
    try {
      const res = await fetch("/api/admin/snapshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mintAddress: mint.trim() }),
      });
      const data = (await res.json()) as { ok?: boolean; holders?: Holder[] };
      if (res.ok && data.ok && Array.isArray(data.holders)) {
        setHolders(data.holders);
        ui.showToast("success", `${data.holders.length} holders`);
      } else {
        ui.showToast("error", "Snapshot failed");
      }
    } catch {
      ui.showToast("error", "Snapshot failed");
    } finally {
      setSnapshotting(false);
    }
  };

  const total = holders?.reduce((s, h) => s + h.uiAmount, 0) ?? 0;

  const exportCsv = () => {
    if (!holders) return;
    const rows: string[][] = [
      ["Rank", "Wallet", "Tokens", "Share", "EstSOL"],
      ...holders.map((h, i) => {
        const share = total > 0 ? h.uiAmount / total : 0;
        const est = balanceSOL !== null ? share * balanceSOL : 0;
        return [
          String(i + 1),
          h.address,
          h.uiAmount.toString(),
          `${(share * 100).toFixed(4)}%`,
          est.toFixed(4),
        ];
      }),
    ];
    downloadCsv("holder-snapshot.csv", rows);
  };

  return (
    <Panel n={4} title="Champion + Prize Distribution">
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
                  {holders.map((h, i) => {
                    const share = total > 0 ? h.uiAmount / total : 0;
                    const est =
                      balanceSOL !== null ? share * balanceSOL : null;
                    return (
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
                          {(share * 100).toFixed(2)}%
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono tabular-nums text-green-600">
                          {est !== null ? est.toFixed(3) : "—"}
                        </td>
                      </tr>
                    );
                  })}
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

// ── Section 5 — Announcement Banner ───────────────────────────────────────────

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
      const ok = await saveKv("featured_announcement", text);
      ui.showToast(ok ? "success" : "error", ok ? "Published" : "Failed");
      if (ok) reload();
    });
  };
  const clear = () => {
    ui.requestConfirm("Remove the site-wide announcement?", async () => {
      const ok = await saveKv("featured_announcement", null);
      ui.showToast(ok ? "success" : "error", ok ? "Cleared" : "Failed");
      if (ok) {
        setText("");
        reload();
      }
    });
  };

  return (
    <Panel n={5} title="Announcement Banner">
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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const { results, champion } = useMatchResults();
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
    matchId: string | null;
    announcement: string | null;
  }>({ matchId: null, announcement: null });

  const reloadFeatured = useCallback(async () => {
    try {
      const res = await fetch("/api/featured");
      if (!res.ok) return;
      const d = (await res.json()) as {
        matchId?: unknown;
        announcement?: unknown;
      };
      setFeatured({
        matchId: typeof d.matchId === "string" ? d.matchId : null,
        announcement: typeof d.announcement === "string" ? d.announcement : null,
      });
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void reloadFeatured();
  }, [reloadFeatured]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(id);
  }, [toast]);

  const ui: AdminUI = {
    showToast: (kind, message) => setToast({ kind, message }),
    requestConfirm: (message, action) => setConfirm({ message, action }),
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold uppercase tracking-tight text-slate-900">
          Control Panel
        </h1>
        <span className="font-mono text-xs text-slate-400">
          {publicKey
            ? `Connected: ${publicKey.toBase58().slice(0, 4)}…${publicKey
                .toBase58()
                .slice(-4)}`
            : "Wallet not connected"}
        </span>
      </header>

      <FeaturedSection ui={ui} featured={featured} reload={reloadFeatured} />
      <ResultsSection ui={ui} results={results} reload={reloadFeatured} />
      <TokenAddressSection ui={ui} />
      <ChampionSection
        ui={ui}
        results={results}
        champion={champion}
        balanceSOL={balanceSOL}
        reload={reloadFeatured}
      />
      <AnnouncementSection ui={ui} featured={featured} reload={reloadFeatured} />

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
