"use client";

import Link from "next/link";
import { SCHEDULE, type ScheduledMatch } from "@/constants/schedule";
import { TEAMS, type Team } from "@/constants/teams";
import type { MatchResult } from "@/hooks/useMatchResults";
import {
  computeStandings,
  GROUP_LETTERS,
  type Standing,
} from "@/lib/standings";
import { Flag } from "@/components/Flag";
import { Icon } from "@/components/Icon";

export interface TournamentBracketProps {
  results: MatchResult[];
  champion: string | null;
}

const ROUND_ORDER = [
  "Round of 32",
  "Round of 16",
  "Quarterfinal",
  "Semifinal",
  "Final",
] as const;
const KNOCKOUT_MATCHES = SCHEDULE.filter((m) =>
  (ROUND_ORDER as readonly string[]).includes(m.groupOrRound),
);
const TEAM_BY_TICKER = new Map(TEAMS.map((t) => [t.ticker, t]));

function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

function teamFor(ticker: string): Team | undefined {
  return TEAM_BY_TICKER.get(ticker);
}

// ── Knockout slot resolution ──────────────────────────────────────────────────

interface SlotContext {
  resultByMatchId: Map<string, MatchResult>;
  byGroup: Map<string, Standing[]>;
  groupComplete: Map<string, boolean>;
}

interface TeamRef {
  ticker: string | null; // resolved team, or null when still a slot
  label: string; // fallback text ("Winner Group A", …)
}

function matchIdForNumber(n: string): string {
  return `GM${n.padStart(3, "0")}`;
}

function resolveSlot(label: string, ctx: SlotContext): TeamRef {
  let m: RegExpExecArray | null;

  if ((m = /^Winner Match (\d+)$/.exec(label))) {
    return {
      ticker: ctx.resultByMatchId.get(matchIdForNumber(m[1]))?.winner ?? null,
      label,
    };
  }
  if ((m = /^Loser Match (\d+)$/.exec(label))) {
    return {
      ticker: ctx.resultByMatchId.get(matchIdForNumber(m[1]))?.loser ?? null,
      label,
    };
  }
  if ((m = /^Winner Group ([A-L])$/.exec(label))) {
    const g = m[1];
    const st = ctx.byGroup.get(g);
    return {
      ticker: st && ctx.groupComplete.get(g) ? st[0].team.ticker : null,
      label,
    };
  }
  if ((m = /^Runner-up Group ([A-L])$/.exec(label))) {
    const g = m[1];
    const st = ctx.byGroup.get(g);
    return {
      ticker: st && ctx.groupComplete.get(g) ? st[1].team.ticker : null,
      label,
    };
  }
  // "Best 3rd (…)" and anything else stays a slot label.
  return { ticker: TEAM_BY_TICKER.has(label) ? label : null, label };
}

// ── Presentational bits ───────────────────────────────────────────────────────

function Dot({ color }: { color: "green" | "grey" | "red" | "none" }) {
  const cls =
    color === "green"
      ? "bg-green-500"
      : color === "red"
        ? "bg-red-500"
        : color === "grey"
          ? "bg-slate-300"
          : "bg-slate-200";
  return (
    <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${cls}`} />
  );
}

function GroupTable({
  letter,
  standings,
  complete,
  started,
  best8,
}: {
  letter: string;
  standings: Standing[];
  complete: boolean;
  started: boolean;
  best8: Set<string>;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-card">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
          Group {letter}
        </span>
        <span className="font-mono text-[10px] text-slate-300">W-D-L</span>
      </div>
      <div className="flex flex-col">
        {standings.map((s) => {
          const ticker = s.team.ticker;
          const eliminated =
            complete && (s.rank === 4 || (s.rank === 3 && !best8.has(ticker)));
          const color: "green" | "grey" | "red" | "none" = !started
            ? "none"
            : s.rank <= 2
              ? "green"
              : s.rank === 3
                ? complete && !best8.has(ticker)
                  ? "red"
                  : "grey"
                : complete
                  ? "red"
                  : "none";
          return (
            <Link
              key={ticker}
              href={`/token/${ticker}`}
              className="flex items-center gap-2 rounded px-1.5 py-1 transition-colors hover:bg-slate-50"
            >
              <Dot color={color} />
              <Flag code={s.team.flagCode} className="text-base" />
              <span
                className={cx(
                  "flex-1 truncate text-xs",
                  eliminated ? "text-slate-300 line-through" : "text-slate-700",
                )}
              >
                {s.team.name}
              </span>
              <span className="font-mono text-[10px] tabular-nums text-slate-400">
                {s.wins}-{s.draws}-{s.losses}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function BracketRow({
  refData,
  variant,
}: {
  refData: TeamRef;
  variant: "winner" | "loser" | "neutral";
}) {
  const team = refData.ticker ? teamFor(refData.ticker) : undefined;
  const cls = cx(
    "flex items-center gap-1.5 px-2 py-1.5 text-xs",
    variant === "winner"
      ? "font-bold text-green-600"
      : variant === "loser"
        ? "text-slate-300 line-through"
        : "text-slate-700",
  );

  if (refData.ticker) {
    return (
      <Link
        href={`/token/${refData.ticker}`}
        className={cx(cls, "transition-colors hover:bg-slate-50")}
      >
        <Flag code={team?.flagCode ?? null} className="text-sm" />
        <span className="truncate">{team?.name ?? refData.ticker}</span>
      </Link>
    );
  }
  return (
    <div className={cx(cls, "text-slate-400")}>
      <span className="truncate italic">{refData.label}</span>
    </div>
  );
}

function BracketMatch({
  match,
  ctx,
}: {
  match: ScheduledMatch;
  ctx: SlotContext;
}) {
  const result = ctx.resultByMatchId.get(match.id);

  let top: TeamRef;
  let bottom: TeamRef;
  let topVariant: "winner" | "loser" | "neutral" = "neutral";
  let bottomVariant: "winner" | "loser" | "neutral" = "neutral";

  if (result) {
    top = { ticker: result.winner, label: result.winner };
    bottom = { ticker: result.loser, label: result.loser };
    topVariant = "winner";
    bottomVariant = "loser";
  } else {
    top = resolveSlot(match.teamA, ctx);
    bottom = resolveSlot(match.teamB, ctx);
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <BracketRow refData={top} variant={topVariant} />
      <div className="border-t border-slate-100" />
      <BracketRow refData={bottom} variant={bottomVariant} />
    </div>
  );
}

function ChampionBanner({ champion }: { champion: string | null }) {
  const team = champion ? teamFor(champion) : undefined;
  return (
    <div className="inline-flex items-center gap-2 self-start rounded-full border border-amber-300 bg-amber-50 px-4 py-1.5 text-sm font-bold text-amber-700">
      <Icon name="trophy" size={16} className="text-amber-500" />
      {champion ? (
        <span className="inline-flex items-center gap-1.5">
          {team && <Flag code={team.flagCode} className="text-sm" />}
          {team?.name ?? champion}
        </span>
      ) : (
        <span className="text-amber-600/70">Champion TBD</span>
      )}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function TournamentBracket({
  results,
  champion,
}: TournamentBracketProps) {
  const { byGroup, groupComplete, groupStarted, best8Thirds } =
    computeStandings(results);
  const ctx: SlotContext = {
    resultByMatchId: new Map(results.map((r) => [r.matchId, r])),
    byGroup,
    groupComplete,
  };

  const rounds = ROUND_ORDER.map((round) => ({
    round,
    matches: KNOCKOUT_MATCHES.filter((m) => m.groupOrRound === round),
  }));

  return (
    <div className="flex flex-col gap-8">
      {/* Section 1 — Group Stage */}
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">
            Group Stage
          </h3>
          <div className="flex items-center gap-3 text-[10px] text-slate-400">
            <span className="flex items-center gap-1">
              <Dot color="green" /> Advance
            </span>
            <span className="flex items-center gap-1">
              <Dot color="grey" /> 3rd place
            </span>
            <span className="flex items-center gap-1">
              <Dot color="red" /> Out
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {GROUP_LETTERS.map((letter) => (
            <GroupTable
              key={letter}
              letter={letter}
              standings={byGroup.get(letter) ?? []}
              complete={groupComplete.get(letter) ?? false}
              started={groupStarted.get(letter) ?? false}
              best8={best8Thirds}
            />
          ))}
        </div>
      </section>

      {/* Section 2 — Knockout Bracket */}
      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">
          Knockout Bracket
        </h3>
        <ChampionBanner champion={champion} />
        <div className="overflow-x-auto pb-2">
          <div className="flex min-w-max items-stretch">
            {rounds.map((col, ci) => {
              const isFirst = ci === 0;
              const isLast = ci === rounds.length - 1;
              return (
                <div key={col.round} className="flex w-[210px] flex-col">
                  <h4 className="mb-2 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    {col.round}
                  </h4>
                  <div className="flex flex-1 flex-col">
                    {col.matches.map((match, mi) => {
                      const topOfPair = mi % 2 === 0;
                      return (
                        <div
                          key={match.id}
                          className="relative flex flex-1 items-center px-3"
                        >
                          {/* link in from the previous round */}
                          {!isFirst && (
                            <span className="pointer-events-none absolute left-0 top-1/2 h-px w-3 bg-slate-200" />
                          )}
                          {/* link out + vertical spine joining the pair */}
                          {!isLast && (
                            <>
                              <span className="pointer-events-none absolute right-0 top-1/2 h-px w-3 bg-slate-200" />
                              <span
                                className={cx(
                                  "pointer-events-none absolute right-0 w-px bg-slate-200",
                                  topOfPair ? "bottom-0 top-1/2" : "top-0 bottom-1/2",
                                )}
                              />
                            </>
                          )}
                          <div className="relative z-10 w-full">
                            <BracketMatch match={match} ctx={ctx} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
