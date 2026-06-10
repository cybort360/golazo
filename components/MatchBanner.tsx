"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ScheduledMatch } from "@/constants/schedule";
import type { MatchResult } from "@/hooks/useMatchResults";
import { TEAMS } from "@/constants/teams";
import { useTokenPrice } from "@/hooks/useTokenPrice";
import { useTokenAddresses } from "@/hooks/useTokenAddresses";
import { usePrizePool } from "@/hooks/usePrizePool";
import { getMatchStatus, getKickoffMs } from "@/lib/schedule";
import { formatCountdown, formatCountdownPrecise } from "@/lib/time";
import { Flag } from "@/components/Flag";
import { Icon } from "@/components/Icon";
import { LocalTime } from "@/components/LocalTime";

export interface MatchBannerProps {
  match: ScheduledMatch | null;
  result: MatchResult | null; // null if not yet played
}

// Opening match: 11 June 2026, 15:00 ET (19:00 UTC) at Estadio Azteca.
const TOURNAMENT_START_UTC = Date.UTC(2026, 5, 11, 19, 0, 0);

type ClockKind = "upcoming" | "live" | "completed" | "draw";
interface Clock {
  kind: ClockKind;
  label: string;
}

function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

function teamFor(ticker: string) {
  return TEAMS.find((t) => t.ticker === ticker);
}

function formatUsdPrice(value: string): string {
  const n = Number.parseFloat(value);
  if (!Number.isFinite(n)) return "—";
  if (n >= 1)
    return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (n >= 0.01) return `$${n.toFixed(4)}`;
  if (n > 0) return `$${n.toFixed(8).replace(/0+$/, "")}`;
  return "$0.00";
}

function formatUsd(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function computeClock(
  match: ScheduledMatch | null,
  result: MatchResult | null,
  now: number | null,
): Clock {
  if (result) {
    return result.isDraw
      ? { kind: "draw", label: "DRAW" }
      : { kind: "completed", label: "FINAL" };
  }
  // now === null on the server / first paint -> render a stable placeholder.
  if (!match || now === null) return { kind: "upcoming", label: "—" };

  if (getMatchStatus(match, []) === "live") {
    return { kind: "live", label: "LIVE NOW" };
  }
  return {
    kind: "upcoming",
    label: formatCountdownPrecise(getKickoffMs(match) - now),
  };
}

// ── Pitch markings (top-down view, pure CSS) ──────────────────────────────────

function PitchMarkings() {
  return (
    <div className="pointer-events-none absolute inset-0">
      {/* halfway line */}
      <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/40" />
      {/* center circle */}
      <div className="absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/40" />
      {/* center dot */}
      <div className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/40" />
      {/* left penalty area */}
      <div className="absolute left-0 top-1/2 h-28 w-14 -translate-y-1/2 border-2 border-l-0 border-white/40 md:h-32 md:w-16" />
      {/* right penalty area */}
      <div className="absolute right-0 top-1/2 h-28 w-14 -translate-y-1/2 border-2 border-r-0 border-white/40 md:h-32 md:w-16" />
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ChangePill({ value }: { value: number | null }) {
  if (value === null) return null;
  const up = value >= 0;
  return (
    <span
      className={cx(
        "inline-flex items-center gap-0.5 rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold tabular-nums shadow-sm md:text-xs",
        up ? "text-green-600" : "text-red-500",
      )}
    >
      <Icon name={up ? "up" : "down"} size={11} strokeWidth={2.5} />
      {Math.abs(value).toFixed(2)}%
    </span>
  );
}

function BuyButton({ ticker, url }: { ticker: string; url: string | null }) {
  if (!url) {
    return (
      <span className="inline-flex items-center rounded-full bg-white/20 px-4 py-1.5 text-xs font-medium text-white/70 ring-1 ring-white/30">
        Not launched
      </span>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Buy ${ticker} on pump.fun`}
      className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-xs font-medium text-green-700 shadow-sm transition-transform duration-200 hover:-translate-y-0.5 md:text-sm"
    >
      Buy ${ticker}
    </a>
  );
}

function TeamSide({
  ticker,
  align,
  isWinner,
  dimmed,
}: {
  ticker: string;
  align: "left" | "right";
  isWinner: boolean;
  dimmed: boolean;
}) {
  const team = teamFor(ticker);
  const { priceUsd, priceChange24h, isLoading } = useTokenPrice(
    team ? ticker : "",
  );
  // pumpUrl / axiomUrl come from the live (admin-managed) data; other fields
  // stay static.
  const { teams: liveTeams } = useTokenAddresses();
  const liveTeam = liveTeams.find((t) => t.ticker === ticker);
  const pumpUrl = liveTeam?.pumpUrl ?? team?.pumpUrl ?? null;
  const axiomUrl = liveTeam?.axiomUrl ?? team?.axiomUrl ?? null;
  const right = align === "right";

  return (
    <div
      className={cx(
        "flex min-w-0 flex-col gap-1.5 text-white transition-opacity md:gap-2 [text-shadow:0_1px_3px_rgba(0,0,0,0.35)]",
        right ? "items-end text-right" : "items-start text-left",
        dimmed && "opacity-50",
      )}
    >
      <div className="relative">
        <Flag
          code={team?.flagCode ?? null}
          className="block rounded-md text-4xl leading-none shadow-md ring-1 ring-black/10 md:text-5xl"
        />
        {isWinner && (
          <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-white shadow ring-2 ring-white">
            <Icon name="check" size={11} strokeWidth={3} />
          </span>
        )}
      </div>

      <div className="max-w-full truncate text-sm font-bold leading-tight tracking-tight sm:text-base md:text-xl">
        {team?.name ?? ticker}
      </div>

      {team ? (
        <>
          <div className="text-xs font-medium text-white/70 md:text-sm">
            ${ticker}
          </div>
          <div className="text-lg font-semibold tabular-nums md:text-2xl">
            {priceUsd ? (
              formatUsdPrice(priceUsd)
            ) : isLoading ? (
              <span className="inline-block h-5 w-20 animate-pulse rounded bg-white/25 align-middle md:h-6" />
            ) : (
              "—"
            )}
          </div>
          <ChangePill value={priceChange24h} />
          <div
            className={cx(
              "mt-0.5 flex flex-col gap-1",
              right ? "items-end" : "items-start",
            )}
          >
            <BuyButton ticker={ticker} url={pumpUrl} />
            {axiomUrl && (
              <a
                href={axiomUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Trade ${ticker} on Axiom`}
                className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-[11px] font-medium text-white ring-1 ring-white/30 backdrop-blur-sm transition-colors hover:bg-white/25"
              >
                Trade on Axiom
              </a>
            )}
          </div>
        </>
      ) : (
        <div className="text-[10px] uppercase tracking-widest text-white/70">
          To be decided
        </div>
      )}
    </div>
  );
}

function StatusBadge({
  match,
  result,
  clock,
}: {
  match: ScheduledMatch;
  result: MatchResult | null;
  clock: Clock;
}) {
  if (clock.kind === "live") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-600 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white shadow ring-2 ring-white/40">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
        </span>
        Live
      </span>
    );
  }
  if (clock.kind === "completed") {
    const winnerTeam = result ? teamFor(result.winner) : undefined;
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
        {winnerTeam ? (
          <Flag code={winnerTeam.flagCode} className="text-sm" />
        ) : (
          <Icon name="trophy" size={13} className="text-amber-500" />
        )}
        {result ? `${result.winner} wins` : "Full time"}
      </span>
    );
  }
  if (clock.kind === "draw") {
    return (
      <span className="rounded-full bg-amber-400 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-sm">
        Draw
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-white px-3 py-1 text-xs shadow-sm">
      <Icon name="football" size={12} className="text-green-600" />
      <span className="hidden font-medium uppercase tracking-wider text-slate-400 sm:inline">
        Next match
      </span>
      {clock.label === "—" ? (
        // Before mount: show local kickoff time; after, the live countdown.
        <LocalTime
          date={match.date}
          time={match.time}
          className="font-bold tabular-nums text-slate-800"
        />
      ) : (
        <span
          suppressHydrationWarning
          className="font-bold tabular-nums text-slate-800"
        >
          {clock.label.replace(/^Starts in /, "")}
        </span>
      )}
    </span>
  );
}

function CenterColumn({
  match,
  result,
  clock,
}: {
  match: ScheduledMatch;
  result: MatchResult | null;
  clock: Clock;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-1 text-center md:px-4">
      <StatusBadge match={match} result={result} clock={clock} />
      <div className="text-3xl font-black tracking-tight text-white [text-shadow:0_2px_6px_rgba(0,0,0,0.4)] md:text-4xl">
        VS
      </div>
      <div className="text-[10px] font-medium uppercase tracking-wider text-white/70 [text-shadow:0_1px_2px_rgba(0,0,0,0.35)] md:text-xs">
        {match.groupOrRound} · {match.venue}
      </div>
    </div>
  );
}

function TournamentCountdown({ now }: { now: number | null }) {
  const label =
    now === null ? "—" : formatCountdown(TOURNAMENT_START_UTC - now);
  return (
    <div className="relative flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-white [text-shadow:0_2px_6px_rgba(0,0,0,0.4)]">
      <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/80">
        Kickoff
      </span>
      <h2 className="text-xl font-black uppercase leading-tight tracking-tight md:text-3xl">
        World Cup Starts June 11
      </h2>
      <div
        suppressHydrationWarning
        className="text-2xl font-bold tabular-nums md:text-4xl"
      >
        {label}
      </div>
      <span className="text-[11px] font-medium uppercase tracking-wider text-white/80 md:text-xs">
        Golazo launches with it
      </span>
    </div>
  );
}

function PrizeStrip() {
  const { balanceSOL, balanceUSD } = usePrizePool();
  return (
    <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3 md:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-50">
          <Icon name="trophy" size={15} className="text-amber-500" />
        </span>
        <span className="label hidden sm:inline">Prize Pool</span>
        <span className="text-sm font-bold tabular-nums text-slate-900 md:text-base">
          {balanceSOL !== null ? `${balanceSOL.toFixed(1)} SOL` : "—"}
        </span>
        {balanceUSD !== null && (
          <span className="text-xs tabular-nums text-slate-400 md:text-sm">
            {formatUsd(balanceUSD)}
          </span>
        )}
      </div>
      <Link
        href="/prize-pool"
        className="group inline-flex shrink-0 items-center gap-1 text-xs font-medium text-slate-400 transition-colors hover:text-green-600"
      >
        <span className="hidden sm:inline">Grows with every trade</span>
        <span className="sm:hidden">Prize pool</span>
        <Icon
          name="right"
          size={13}
          className="transition-transform group-hover:translate-x-0.5"
        />
      </Link>
    </div>
  );
}

// ── Banner ────────────────────────────────────────────────────────────────────

export default function MatchBanner({ match, result }: MatchBannerProps) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 1_000);
    return () => clearInterval(id);
  }, []);

  const clock = computeClock(match, result, now);
  const winner = result && !result.isDraw ? result.winner : null;
  const loser = result && !result.isDraw ? result.loser : null;

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 shadow-card-md">
      {/* Pitch */}
      <div className="pitch-stripes relative h-[200px] md:h-[260px]">
        {/* subtle vignette for legibility */}
        <div className="absolute inset-0 bg-[radial-gradient(120%_100%_at_50%_50%,transparent_40%,rgba(0,0,0,0.18))]" />
        <PitchMarkings />

        <div className="relative h-full">
          {match ? (
            <div className="grid h-full grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 md:gap-6 md:px-10">
              <TeamSide
                ticker={match.teamA}
                align="left"
                isWinner={winner === match.teamA}
                dimmed={loser === match.teamA}
              />
              <CenterColumn match={match} result={result} clock={clock} />
              <TeamSide
                ticker={match.teamB}
                align="right"
                isWinner={winner === match.teamB}
                dimmed={loser === match.teamB}
              />
            </div>
          ) : (
            <TournamentCountdown now={now} />
          )}
        </div>
      </div>

      {/* Prize strip */}
      <PrizeStrip />
    </section>
  );
}
