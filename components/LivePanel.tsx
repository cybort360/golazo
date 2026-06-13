"use client";

import { useEffect, useState, type ReactNode } from "react";
import { SCHEDULE, type ScheduledMatch } from "@/constants/schedule";
import { TEAMS } from "@/constants/teams";
import { usePrizePool } from "@/hooks/usePrizePool";
import { useMatchResults, type MatchResult } from "@/hooks/useMatchResults";
import { useLiveMatches } from "@/hooks/useLiveMatches";
import type { LiveMatch } from "@/lib/resultsSync";
import {
  getTodaysMatches,
  getUpcomingMatches,
  getMatchStatus,
  getKickoffMs,
  resultForMatch,
} from "@/lib/schedule";
import { Flag } from "@/components/Flag";
import { Icon } from "@/components/Icon";
import { LocalTime } from "@/components/LocalTime";

// Public wallet addresses (displayed on the site, verifiable on Solscan).
const PRIZE_WALLET = process.env.NEXT_PUBLIC_PRIZE_POOL_WALLET ?? "";
const FUTURE_WALLET = process.env.NEXT_PUBLIC_FUTURE_FUND_WALLET ?? "";

function solscanAccount(address: string): string {
  return `https://solscan.io/account/${address}`;
}

// Kickoff time per match id, so Recent Results can order by when a match was
// actually played (not when its result happened to be recorded).
const KICKOFF_BY_ID = new Map(SCHEDULE.map((m) => [m.id, getKickoffMs(m)]));

function flagCodeFor(ticker: string): string | null {
  return TEAMS.find((t) => t.ticker === ticker)?.flagCode ?? null;
}

function formatUsd(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function formatShortDate(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function findResult(
  match: ScheduledMatch,
  results: MatchResult[],
): MatchResult | undefined {
  // Link by stable matchId (see lib/schedule.resultForMatch) so knockout
  // fixtures and repeat pairings stay correct.
  return resultForMatch(match, results);
}

// ── Shared bits ───────────────────────────────────────────────────────────────

function SolscanLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs font-medium text-green-600 transition-colors hover:text-green-700"
    >
      {label}
      <Icon name="upRight" size={13} />
    </a>
  );
}

/**
 * Collapsible block. On mobile each block is a standalone card in a horizontal
 * strip and can be toggled; on desktop the blocks stack inside a single white
 * panel card, separated by header underlines.
 */
function Card({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <details
      open
      className="group min-w-[85%] shrink-0 snap-start rounded-xl border border-slate-200 bg-white p-4 shadow-card md:min-w-0 md:shrink md:snap-none md:rounded-none md:border-0 md:bg-transparent md:p-0 md:shadow-none"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between border-b border-slate-100 pb-2 text-xs font-bold uppercase tracking-wider text-slate-400 [&::-webkit-details-marker]:hidden md:cursor-default md:pointer-events-none">
        <span className="inline-flex items-center gap-1.5">{title}</span>
        <Icon
          name="down"
          size={16}
          className="text-slate-300 transition-transform group-open:rotate-180 md:hidden"
        />
      </summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}

function TeamInline({ ticker }: { ticker: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700">
      <Flag code={flagCodeFor(ticker)} className="text-sm" />
      {ticker}
    </span>
  );
}

type Status = "upcoming" | "live" | "completed" | "draw";

function matchStatus(
  match: ScheduledMatch,
  results: MatchResult[],
  now: number | null,
): Status {
  const r = findResult(match, results);
  if (r) return r.isDraw ? "draw" : "completed"; // deterministic, SSR-safe
  if (now === null) return "upcoming"; // placeholder until mounted
  return getMatchStatus(match, results);
}

function MatchStatusBadge({
  status,
  match,
  result,
}: {
  status: Status;
  match: ScheduledMatch;
  result: MatchResult | undefined;
}) {
  if (status === "live") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-600 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
        </span>
        Live
      </span>
    );
  }
  if (status === "completed") {
    return (
      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
        {result ? `${result.winner} wins` : "Full time"}
      </span>
    );
  }
  if (status === "draw") {
    return (
      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-amber-700">
        Draw
      </span>
    );
  }
  return (
    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium tabular-nums text-slate-500">
      <LocalTime date={match.date} time={match.time} />
    </span>
  );
}

/**
 * Align a live snapshot's home/away scores to a fixture's teamA/teamB and render
 * "A–B". Returns null when there's no usable score yet. For knockout fixtures
 * (placeholder teamA/teamB) the tickers won't match, so we fall back to the
 * feed's home–away order.
 */
function LiveScore({
  match,
  live,
  tone,
}: {
  match: ScheduledMatch;
  live: LiveMatch | undefined;
  tone: "live" | "final";
}) {
  if (!live || live.homeScore === null || live.awayScore === null) return null;
  let a = live.homeScore;
  let b = live.awayScore;
  if (live.homeTicker === match.teamB && live.awayTicker === match.teamA) {
    a = live.awayScore;
    b = live.homeScore;
  }
  return (
    <span
      className={
        tone === "live"
          ? "tabular-nums text-sm font-bold text-green-700"
          : "tabular-nums text-sm font-bold text-slate-700"
      }
    >
      {a}
      <span className="px-0.5 text-slate-300">–</span>
      {b}
    </span>
  );
}

// ── Panel ─────────────────────────────────────────────────────────────────────

export default function LivePanel() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 1_000);
    return () => clearInterval(id);
  }, []);

  const { balanceSOL, balanceUSD, futureFundSOL } = usePrizePool();
  const { results } = useMatchResults();
  const { liveByMatchId } = useLiveMatches();

  const today = getTodaysMatches();
  const shownToday = today.slice(0, 4);
  const nextMatch =
    today.length === 0 ? (getUpcomingMatches(1, results)[0] ?? null) : null;

  // The three most-recently-played results, latest match first — ordered by
  // kickoff, not by when the result was recorded.
  const recent = [...results]
    .sort(
      (a, b) =>
        (KICKOFF_BY_ID.get(b.matchId) ?? 0) - (KICKOFF_BY_ID.get(a.matchId) ?? 0),
    )
    .slice(0, 3);

  return (
    <aside className="flex snap-x snap-mandatory gap-3 self-start overflow-x-auto pb-2 no-scrollbar md:flex-col md:gap-6 md:overflow-x-visible md:snap-none md:rounded-2xl md:border md:border-slate-200 md:bg-white md:p-6 md:pb-7 md:shadow-card">
      {/* Block 1: Prize Pool */}
      <Card
        title={
          <>
            <Icon name="trophy" size={14} className="text-amber-500" /> Prize
            Pool
          </>
        }
      >
        {balanceSOL !== null ? (
          <div className="text-3xl font-bold tabular-nums text-slate-900">
            {balanceSOL.toFixed(1)} SOL
          </div>
        ) : (
          <div className="h-8 w-32 animate-pulse rounded bg-slate-100" />
        )}
        {balanceUSD !== null && (
          <div className="mt-1 text-sm text-slate-400">
            ≈ {formatUsd(balanceUSD)} USD
          </div>
        )}
        {/* decorative progress indicator */}
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="h-full w-[72%] rounded-full bg-gradient-to-r from-green-500 to-green-400" />
        </div>
        <div className="mt-2 text-xs text-slate-400">35% of all trading fees</div>
        {PRIZE_WALLET && (
          <div className="mt-3">
            <SolscanLink
              href={solscanAccount(PRIZE_WALLET)}
              label="View on Solscan"
            />
          </div>
        )}
      </Card>

      {/* Block 2: Today's Matches */}
      <Card title="Today's Matches">
        {today.length === 0 ? (
          <div className="flex flex-col items-center gap-1.5 py-1.5 text-center">
            <Icon name="football" size={20} className="text-slate-300" />
            <p className="text-sm text-slate-400">
              No matches today.
              {nextMatch && (
                <>
                  {" "}
                  Next:{" "}
                  <span className="font-medium text-slate-600">
                    {formatShortDate(nextMatch.date)}
                  </span>
                </>
              )}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {shownToday.map((match) => {
              const status = matchStatus(match, results, now);
              const result = findResult(match, results);
              const live = liveByMatchId[match.id];
              const showScore = status === "live" || status === "completed";
              return (
                <div key={match.id} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <TeamInline ticker={match.teamA} />
                      <span className="text-xs text-slate-300">vs</span>
                      <TeamInline ticker={match.teamB} />
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {showScore && (
                        <LiveScore
                          match={match}
                          live={live}
                          tone={status === "live" ? "live" : "final"}
                        />
                      )}
                      <MatchStatusBadge
                        status={status}
                        match={match}
                        result={result}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Block 3: Recent Results */}
      <Card title="Recent Results">
        {recent.length === 0 ? (
          <div className="flex flex-col items-center gap-1.5 py-1.5 text-center">
            <Icon name="trophy" size={20} className="text-slate-300" />
            <p className="text-sm text-slate-400">No results yet</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {recent.map((r) => (
              <div
                key={r.matchId}
                className="flex items-center justify-between gap-2"
              >
                <div className="flex min-w-0 items-center gap-1.5">
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                    <Flag code={flagCodeFor(r.winner)} className="text-sm" />
                    {r.winner}
                  </span>
                  <span className="text-xs italic text-slate-400">
                    {r.isDraw ? "drew" : "def."}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-sm text-slate-400 line-through">
                    <Flag
                      code={flagCodeFor(r.loser)}
                      className="text-sm no-underline"
                    />
                    {r.loser}
                  </span>
                </div>
                {r.goalsWinner != null && r.goalsLoser != null && (
                  <span className="shrink-0 tabular-nums text-xs font-bold text-slate-700">
                    {r.goalsWinner}
                    <span className="px-0.5 text-slate-300">–</span>
                    {r.goalsLoser}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Block 4: Future Fund */}
      <Card
        title={
          <>
            <Icon name="leaf" size={14} className="text-green-600" /> Future Fund
          </>
        }
      >
        {futureFundSOL !== null ? (
          <div className="text-2xl font-bold tabular-nums text-slate-900">
            {futureFundSOL.toFixed(1)} SOL
          </div>
        ) : (
          <div className="h-7 w-24 animate-pulse rounded bg-slate-100" />
        )}
        <div className="mt-1 text-xs text-slate-400">
          Seeds the next tournament + rewards $GOLAZO holders
        </div>
        {FUTURE_WALLET && (
          <div className="mt-3">
            <SolscanLink
              href={solscanAccount(FUTURE_WALLET)}
              label="View on Solscan"
            />
          </div>
        )}
      </Card>
    </aside>
  );
}
