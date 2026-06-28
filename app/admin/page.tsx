"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { SCHEDULE, type ScheduledMatch } from "@/constants/schedule";
import { TEAMS } from "@/constants/teams";
import { deriveTeamStatuses } from "@/lib/standings";
import { useMatchResults, type MatchResult } from "@/hooks/useMatchResults";
import { getKickoffMs } from "@/lib/schedule";
import { stadiumName } from "@/lib/venues";
import TeamSelect from "@/components/TeamSelect";

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
  // Recorded matches the operator has expanded to override.
  const [editing, setEditing] = useState<Set<string>>(new Set());
  const toggleEditing = (id: string) =>
    setEditing((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

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

  // "To record": fixtures kicking off soon (next 24h) or recently played
  // (last 72h) that DON'T have a result yet — the operator's actual to-do list.
  // Everything already recorded moves into the collapsed "Recorded" accordion so
  // the panel stays short as the tournament fills up.
  const WINDOW_FUTURE_MS = 24 * 60 * 60 * 1000;
  const WINDOW_PAST_MS = 72 * 60 * 60 * 1000;
  const now = Date.now();
  const toRecord = SCHEDULE.filter((m) => {
    if (resultFor(m)) return false;
    const kickoff = getKickoffMs(m);
    return kickoff - WINDOW_FUTURE_MS <= now && now <= kickoff + WINDOW_PAST_MS;
  }).sort((a, b) => getKickoffMs(a) - getKickoffMs(b));

  // Every recorded result, latest match first — collapsed by default, override
  // any of them on demand.
  const recorded = SCHEDULE.filter((m) => resultFor(m)).sort(
    (a, b) => getKickoffMs(b) - getKickoffMs(a),
  );

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

  // The score inputs + save button for one fixture, reused by the "to record"
  // cards and the inline override under a recorded row.
  const matchEditor = (m: ScheduledMatch, saveLabel: string) => {
    const d = draftFor(m.id);
    return (
      <>
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
                onChange={(e) => patch(m.id, { koWinnerGoals: e.target.value })}
                placeholder="W"
                className={`${input} w-16 text-center`}
              />
              <span className="text-slate-300">–</span>
              <input
                inputMode="numeric"
                value={d.koLoserGoals}
                onChange={(e) => patch(m.id, { koLoserGoals: e.target.value })}
                placeholder="L"
                className={`${input} w-16 text-center`}
              />
            </div>
          </div>
        )}
        <div>
          <button onClick={() => submit(m)} className={btnPrimary}>
            {saveLabel}
          </button>
        </div>
      </>
    );
  };

  return (
    <Panel n={1} title="Match Results (auto + override)">
      <LiveSyncLine status={sync} />

      {toRecord.length === 0 ? (
        <p className="text-sm text-slate-400">
          Nothing to record right now — recent matches are all in.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {toRecord.map((m) => (
            <div
              key={m.id}
              className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3"
            >
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="font-semibold text-slate-900">
                  {flag(m.teamA)} {m.teamA} vs {flag(m.teamB)} {m.teamB}
                </span>
                <span className="text-xs text-slate-400">
                  {m.groupOrRound} · {m.time} · {stadiumName(m.venue)}
                </span>
              </div>
              {matchEditor(m, "Save")}
            </div>
          ))}
        </div>
      )}

      {recorded.length > 0 && (
        <details className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white">
          <summary className="cursor-pointer select-none px-3 py-2 text-sm font-semibold text-slate-600">
            Recorded results ({recorded.length})
          </summary>
          <div className="flex flex-col divide-y divide-slate-100 border-t border-slate-100">
            {recorded.map((m) => {
              const r = resultFor(m)!;
              const open = editing.has(m.id);
              return (
                <div key={m.id} className="flex flex-col gap-2 px-3 py-2">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="min-w-0 truncate text-slate-700">
                      {flag(r.winner)} {r.winner}{" "}
                      <span className="italic text-slate-400">
                        {r.isDraw ? "drew" : "def."}
                      </span>{" "}
                      {flag(r.loser)} {r.loser}
                      {r.goalsWinner != null && r.goalsLoser != null && (
                        <span className="ml-1 tabular-nums text-slate-500">
                          ({r.goalsWinner}–{r.goalsLoser})
                        </span>
                      )}
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          r.source === "api"
                            ? "bg-blue-50 text-blue-600"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {sourceLabel(r)}
                      </span>
                      <button
                        onClick={() => toggleEditing(m.id)}
                        className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                      >
                        {open ? "Close" : "Override"}
                      </button>
                    </span>
                  </div>
                  {open && matchEditor(m, "Save override")}
                </div>
              );
            })}
          </div>
        </details>
      )}
    </Panel>
  );
}

// ── Section 2: Champion ──────────────────────────────────────────────────────

function ChampionSection({
  ui,
  results,
  champion,
  reload,
}: {
  ui: AdminUI;
  results: MatchResult[];
  champion: string | null;
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

  return (
    <Panel n={2} title="Champion">
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
    </Panel>
  );
}

// ── Section 3: Announcement Banner ───────────────────────────────────────────

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
    <Panel n={3} title="Announcement Banner">
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
  const { results, champion, reload: reloadResults } = useMatchResults();

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
        <button onClick={logout} className={btnGhost}>
          Log out
        </button>
      </header>

      <ResultsSection ui={ui} results={results} reload={reloadAll} />
      <ChampionSection
        ui={ui}
        results={results}
        champion={champion}
        reload={reloadAll}
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
