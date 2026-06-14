"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import MatchBanner from "@/components/MatchBanner";
import BurnsFeed from "@/components/BurnsFeed";
import StatsStrip from "@/components/StatsStrip";
import SocialLinks from "@/components/SocialLinks";
import ShareButtons from "@/components/ShareButtons";
import LivePanel from "@/components/LivePanel";
import StatsCard from "@/components/StatsCard";
import GroupTable from "@/components/GroupTable";
import { Flag } from "@/components/Flag";
import { Icon } from "@/components/Icon";
import { LocalTime } from "@/components/LocalTime";
import { type ScheduledMatch } from "@/constants/schedule";
import { TEAMS, type Team } from "@/constants/teams";
import { useTokenAddresses } from "@/hooks/useTokenAddresses";
import {
  getNextUnplayedMatch,
  getTodaysMatches,
  getMatchStatus,
  resultForMatch,
} from "@/lib/schedule";
import { GROUP_LETTERS } from "@/lib/standings";
import { stadiumName } from "@/lib/venues";
import { useMatchResults, type MatchResult } from "@/hooks/useMatchResults";
import { useLiveMatches } from "@/hooks/useLiveMatches";
import type { LiveMatch } from "@/lib/resultsSync";
import {
  getMultipleTokenPrices,
  getTokenPrice,
  type TokenPrice,
} from "@/lib/dexscreener";

// ── Helpers ───────────────────────────────────────────────────────────────────

const TEAM_BY_TICKER = new Map(TEAMS.map((t) => [t.ticker, t]));

function teamFor(ticker: string): Team | undefined {
  return TEAM_BY_TICKER.get(ticker);
}

function formatPrice(value: string): string {
  const n = Number.parseFloat(value);
  if (!Number.isFinite(n)) return "—";
  if (n >= 1)
    return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (n >= 0.01) return `$${n.toFixed(4)}`;
  if (n > 0) return `$${n.toFixed(8).replace(/0+$/, "")}`;
  return "$0.00";
}

function compactUsd(n: number): string {
  if (!Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `$${(n / 1e3).toFixed(1)}k`;
  return `$${n.toFixed(0)}`;
}

type Status = "upcoming" | "live" | "completed" | "draw";

function todayMatchStatus(
  match: ScheduledMatch,
  results: MatchResult[],
  now: number | null,
): Status {
  const r = resultForMatch(match, results);
  if (r) return r.isDraw ? "draw" : "completed";
  if (now === null) return "upcoming";
  return getMatchStatus(match, results);
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">
      {children}
    </h2>
  );
}

function MiniTeam({ ticker }: { ticker: string }) {
  const team = teamFor(ticker);
  const body = (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700">
      <Flag code={team?.flagCode ?? null} className="text-base" />
      {ticker}
    </span>
  );
  return team ? (
    <Link
      href={`/token/${ticker}`}
      className="transition-opacity hover:opacity-70"
    >
      {body}
    </Link>
  ) : (
    <span className="text-sm text-slate-400">{ticker}</span>
  );
}

function TodayCardBadge({
  status,
  date,
  time,
}: {
  status: Status;
  date: string;
  time: string;
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
  if (status === "completed")
    return (
      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
        Full time
      </span>
    );
  if (status === "draw")
    return (
      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-amber-700">
        Draw
      </span>
    );
  return (
    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium tabular-nums text-slate-500">
      <LocalTime date={date} time={time} />
    </span>
  );
}

function liveScoreForCard(
  match: ScheduledMatch,
  live: LiveMatch | undefined,
): { a: number; b: number } | null {
  if (!live || live.homeScore === null || live.awayScore === null) return null;
  return live.homeTicker === match.teamB && live.awayTicker === match.teamA
    ? { a: live.awayScore, b: live.homeScore }
    : { a: live.homeScore, b: live.awayScore };
}

function TodayMatchCard({
  match,
  status,
  live,
}: {
  match: ScheduledMatch;
  status: Status;
  live: LiveMatch | undefined;
}) {
  const score =
    status === "live" || status === "completed" || status === "draw"
      ? liveScoreForCard(match, live)
      : null;
  return (
    <div className="flex min-w-[230px] shrink-0 snap-start flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-card transition-shadow hover:shadow-card-md">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MiniTeam ticker={match.teamA} />
          <span className="text-xs text-slate-300">vs</span>
          <MiniTeam ticker={match.teamB} />
        </div>
        {score && (
          <span
            className={`tabular-nums text-sm font-bold ${
              status === "live" ? "text-green-700" : "text-slate-700"
            }`}
          >
            {score.a}
            <span className="px-0.5 text-slate-300">–</span>
            {score.b}
          </span>
        )}
      </div>
      <div className="text-xs text-slate-400">
        <LocalTime date={match.date} time={match.time} /> ·{" "}
        {stadiumName(match.venue)}
      </div>
      <div>
        <TodayCardBadge status={status} date={match.date} time={match.time} />
      </div>
    </div>
  );
}

const WHY_CARDS: {
  icon: "fire" | "coins" | "trophy" | "check";
  tint: string;
  title: string;
  body: string;
}[] = [
  {
    icon: "fire",
    tint: "bg-orange-50 text-orange-500",
    title: "We buy back your token",
    body: "After every match, we use trading fees to buy and burn the winning team's token on the open market. Less supply. Same demand.",
  },
  {
    icon: "coins",
    tint: "bg-green-50 text-green-600",
    title: "Weekly prizes in SOL",
    body: "Every week we pick a Prize Match. Hold the winning team's token at kickoff and collect a share of that week's pot, paid directly to your wallet.",
  },
  {
    icon: "trophy",
    tint: "bg-amber-50 text-amber-500",
    title: "Championship payout",
    body: "When the Final ends, every holder of the champion's token shares the accumulated prize pool, proportional to what they hold.",
  },
  {
    icon: "check",
    tint: "bg-violet-50 text-violet-600",
    title: "Verify it all on-chain",
    body: "Every wallet, buyback and payout lives on Solana. Check it yourself on Solscan, nothing here is self-reported.",
  },
];

function WhyGolazo() {
  return (
    <section className="flex flex-col gap-3">
      <SectionHeading>Why Golazo</SectionHeading>
      <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0">
        {WHY_CARDS.map((c) => (
          <div
            key={c.title}
            className="flex min-w-[260px] shrink-0 snap-start flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-card sm:min-w-0"
          >
            <span
              className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${c.tint}`}
            >
              <Icon name={c.icon} size={22} strokeWidth={1.8} />
            </span>
            <h3 className="text-base font-semibold tracking-tight text-slate-900">
              {c.title}
            </h3>
            <p className="text-sm leading-relaxed text-slate-500">{c.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function GolazoCard() {
  // address / meteoraUrl come from the live (admin-managed) data; everything else
  // stays static.
  const { golazo } = useTokenAddresses();
  const address = golazo.address;
  const [price, setPrice] = useState<TokenPrice | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!address) {
      setPrice(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    let cancelled = false;
    const load = async () => {
      const p = await getTokenPrice(address);
      if (!cancelled) {
        setPrice(p);
        setLoading(false);
      }
    };
    void load();
    const id = setInterval(() => void load(), 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [address]);

  const launched = address !== null;

  return (
    <section className="relative flex h-full items-center justify-between gap-3 overflow-hidden rounded-2xl border border-green-200 bg-green-50 p-4 shadow-card">
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(22,163,74,0.15), transparent 70%)",
        }}
      />
      <div className="relative flex min-w-0 flex-col gap-0.5">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-green-600">
          Platform Token
        </span>
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-bold tracking-tight text-slate-900">
            $GOLAZO
          </span>
          {launched ? (
            loading && !price ? (
              <span className="inline-block h-6 w-20 animate-pulse rounded bg-green-100" />
            ) : (
              <span className="text-xl font-bold tabular-nums text-slate-900">
                {price ? formatPrice(price.priceUsd) : "—"}
              </span>
            )
          ) : (
            <span className="text-sm font-medium text-slate-500">
              Launching soon…
            </span>
          )}
        </div>
        <span className="truncate text-xs text-slate-500">
          {launched
            ? `MCap ${price ? compactUsd(price.marketCap) : "—"}`
            : "Hold to earn from every future tournament."}
        </span>
      </div>

      <div className="relative flex shrink-0 flex-col items-end gap-2">
        {golazo.meteoraUrl ? (
          <a
            href={golazo.meteoraUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-fit items-center gap-1.5 rounded-full bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-transform hover:-translate-y-0.5"
          >
            Buy $GOLAZO
            <Icon name="right" size={15} strokeWidth={2.5} />
          </a>
        ) : (
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-400 ring-1 ring-slate-200">
            Buy $GOLAZO
            <Icon name="right" size={15} strokeWidth={2.5} />
          </span>
        )}
        {golazo.axiomUrl && (
          <a
            href={golazo.axiomUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-fit items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50"
          >
            Trade on Axiom
            <Icon name="right" size={15} strokeWidth={2.5} />
          </a>
        )}
      </div>
    </section>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Home() {
  const { results, champion } = useMatchResults();
  const { teams: liveTeams } = useTokenAddresses();
  const { liveByMatchId } = useLiveMatches();

  const [announcement, setAnnouncement] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [now, setNow] = useState<number | null>(null);
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

  const toggleGroup = (letter: string) =>
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(letter)) next.delete(letter);
      else next.add(letter);
      return next;
    });
  const expandAll = () => setOpenGroups(new Set(GROUP_LETTERS));
  const collapseAll = () => setOpenGroups(new Set());
  const allOpen = openGroups.size === GROUP_LETTERS.length;

  // Site-wide announcement banner from KV.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/featured", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { announcement: null }))
      .then((d: { announcement?: unknown }) => {
        if (cancelled) return;
        setAnnouncement(
          typeof d.announcement === "string" ? d.announcement : null,
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Mounted clock for hydration-safe match statuses.
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  // Feature the earliest match that isn't settled yet. Passing `now` lets the
  // clock retire matches that finished long ago but have no recorded result,
  // so the banner lands on the real next match on first paint instead of
  // sticking on the opening fixtures until a reload. A match still inside its
  // live window is kept, so an in-progress game keeps the spotlight.
  const featuredMatch = useMemo<ScheduledMatch | null>(
    () => getNextUnplayedMatch(results, now),
    [results, now],
  );

  const featuredResult = useMemo<MatchResult | null>(
    () =>
      featuredMatch
        ? (results.find((r) => r.matchId === featuredMatch.id) ?? null)
        : null,
    [featuredMatch, results],
  );

  const todays = getTodaysMatches();

  // Top movers across all launched tokens (tokenAddress merged from admin data).
  const launchedTeams = useMemo(
    () => liveTeams.filter((t) => t.tokenAddress !== null),
    [liveTeams],
  );
  const [movers, setMovers] = useState<
    { team: Team; price: TokenPrice }[] | null
  >(null);

  useEffect(() => {
    if (launchedTeams.length === 0) {
      setMovers([]);
      return;
    }
    let cancelled = false;
    const addresses = launchedTeams
      .map((t) => t.tokenAddress)
      .filter((a): a is string => a !== null);

    const load = async () => {
      const priceMap = await getMultipleTokenPrices(addresses);
      if (cancelled) return;
      const ranked = launchedTeams
        .map((team) => {
          const price = team.tokenAddress
            ? priceMap.get(team.tokenAddress)
            : undefined;
          return price ? { team, price } : null;
        })
        .filter((x): x is { team: Team; price: TokenPrice } => x !== null)
        .sort((a, b) => b.price.priceChange24h - a.price.priceChange24h)
        .slice(0, 3);
      setMovers(ranked);
    };

    void load();
    const id = setInterval(() => void load(), 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [launchedTeams]);

  const showAnnouncement = announcement !== null && !dismissed;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
      {showAnnouncement && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900 shadow-card">
          <span>{announcement}</span>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="Dismiss announcement"
            className="shrink-0 rounded-md p-1 text-amber-600 transition-colors hover:bg-amber-100 hover:text-amber-800"
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      )}

      <div className="reveal">
        <MatchBanner match={featuredMatch} result={featuredResult} />
      </div>

      {featuredMatch && featuredResult && (
        <div className="reveal -mt-2 flex items-center justify-end gap-2">
          <span className="text-xs text-slate-400">Share the result</span>
          <ShareButtons
            text="Full time at the World Cup ⚽ Follow it on Golazo"
            path={`/s/result/${featuredMatch.id}`}
          />
        </div>
      )}

      <div className="reveal" style={{ animationDelay: "60ms" }}>
        <BurnsFeed />
      </div>

      <div className="reveal" style={{ animationDelay: "90ms" }}>
        <StatsStrip />
      </div>

      <div className="reveal" style={{ animationDelay: "120ms" }}>
        <section className="flex flex-col items-start gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-base font-semibold tracking-tight text-slate-900">
              Join the Golazo community
            </h2>
            <p className="text-sm text-slate-500">
              Live scores, predictions, and prize drops — first on Telegram and X.
            </p>
          </div>
          <SocialLinks variant="chip" />
        </section>
      </div>

      {/* Predict CTA + platform token, side by side near the top so the
          $GOLAZO card is visible without scrolling to the bottom. */}
      <div
        className="reveal grid gap-6 md:grid-cols-2"
        style={{ animationDelay: "82ms" }}
      >
        <Link
          href="/predict"
          className="group flex h-full items-center gap-3 rounded-2xl border border-violet-200 bg-violet-50 p-4 shadow-card transition-transform hover:-translate-y-0.5"
        >
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
            <Icon name="trophy" size={20} />
          </span>
          <div className="flex min-w-0 flex-col">
            <span className="text-base font-bold tracking-tight text-slate-900">
              Predict &amp; win SOL
            </span>
            <span className="text-xs text-slate-500">
              Call each match. Top the weekly board to win the bounty.
            </span>
          </div>
          <Icon
            name="right"
            size={18}
            className="ml-auto shrink-0 text-violet-400 transition-transform group-hover:translate-x-0.5"
          />
        </Link>

        <GolazoCard />
      </div>

      <div
        className="reveal grid grid-cols-1 gap-6 lg:grid-cols-[7fr_3fr]"
        style={{ animationDelay: "90ms" }}
      >
        {/* Left: main content */}
        <div className="flex min-w-0 flex-col gap-8">
          {/* Section 1: Today's Matches */}
          {todays.length > 0 && (
            <section className="flex flex-col gap-3">
              <SectionHeading>Today&apos;s Matches</SectionHeading>
              <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2">
                {todays.map((match) => (
                  <TodayMatchCard
                    key={match.id}
                    match={match}
                    status={todayMatchStatus(match, results, now)}
                    live={liveByMatchId[match.id]}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Section 2: Top Movers */}
          <section className="flex flex-col gap-3">
            <SectionHeading>Top Movers</SectionHeading>
            {movers === null ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {[0, 1, 2].map((i) => (
                  <StatsCard key={i} title="Loading" value="—" isLoading />
                ))}
              </div>
            ) : movers.length === 0 ? (
              <p className="text-sm text-slate-400">
                No tokens launched yet. Check back after the Meteora launch.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {movers.map(({ team, price }) => (
                  <StatsCard
                    key={team.ticker}
                    title={team.name}
                    value={formatPrice(price.priceUsd)}
                    subtitle="24h change"
                    trend={price.priceChange24h}
                    icon={<Flag code={team.flagCode} className="text-base" />}
                    href={`/token/${team.ticker}`}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Section 3: All Teams by Group */}
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <SectionHeading>All Teams</SectionHeading>
              <button
                type="button"
                onClick={allOpen ? collapseAll : expandAll}
                className="text-xs font-semibold uppercase tracking-wider text-green-600 transition-colors hover:text-green-700"
              >
                {allOpen ? "Collapse All" : "Expand All"}
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {GROUP_LETTERS.map((letter) => (
                <GroupTable
                  key={letter}
                  group={letter}
                  teams={liveTeams.filter((t) => t.group === letter)}
                  results={results}
                  champion={champion}
                  open={openGroups.has(letter)}
                  onToggle={() => toggleGroup(letter)}
                />
              ))}
            </div>
          </section>

          {/* Section 4: Why Golazo */}
          <WhyGolazo />
        </div>

        {/* Right: live panel */}
        <LivePanel />
      </div>
    </div>
  );
}
