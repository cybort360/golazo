import type { Match, MarketId, MatchState, PickResult } from "@/lib/predict/types";

// Pure, deterministic market resolvers (PRD §7). Each maps a final match state +
// the relevant stats to WON / LOST / VOID for a given pick option. P2-11's
// auto-settlement runs these against final TxLINE data; keeping them pure makes
// settlement replayable (same input → same output) and unit-testable.

/** A goal is "after the 80th minute" when its minute is strictly greater. */
export const LATE_GOAL_MINUTE = 80;

export interface GoalEvent {
  minute: number; // match minute the goal was scored (1..90+)
  team: "home" | "away";
}

export interface MatchFinal {
  state: MatchState; // final TxLINE state — "VOID" voids every market
  homeScore: number | null;
  awayScore: number | null;
  homeTicker?: string; // maps a "winner" pick's optionId to home/away
  awayTicker?: string;
  // Goal timestamps. Required to resolve "chaos"; `undefined` means the stat is
  // unavailable (→ MARKET VOID for chaos only). An empty array is valid data.
  goals?: GoalEvent[];
  // Per-market stat availability. `false` voids that MARKET only, not the match.
  available?: Partial<Record<MarketId, boolean>>;
}

/** Build a resolver input from a Match plus the goal log / availability flags. */
export function matchToFinal(
  match: Match,
  goals?: GoalEvent[],
  available?: Partial<Record<MarketId, boolean>>,
): MatchFinal {
  return {
    state: match.state,
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    homeTicker: match.home.ticker,
    awayTicker: match.away.ticker,
    goals,
    available,
  };
}

type WinnerOutcome = "home" | "draw" | "away";

function winnerOutcome(home: number, away: number): WinnerOutcome {
  if (home > away) return "home";
  if (home < away) return "away";
  return "draw";
}

function pickedWinner(f: MatchFinal, optionId: string): WinnerOutcome | null {
  if (optionId === "draw") return "draw";
  if (optionId === "home" || optionId === f.homeTicker) return "home";
  if (optionId === "away" || optionId === f.awayTicker) return "away";
  return null;
}

/**
 * Resolve a single pick. Returns VOID for an unresolvable input (match void, no
 * final score, market stat unavailable, or an unknown option) so settlement can
 * safely restore the entry rather than guess.
 */
export function resolvePick(final: MatchFinal, marketId: MarketId, optionId: string): PickResult {
  // Whole-match void.
  if (final.state === "VOID") return "VOID";
  if (final.homeScore == null || final.awayScore == null) return "VOID";

  // Per-market stat unavailable → that market only voids.
  if (final.available?.[marketId] === false) return "VOID";

  const home = final.homeScore;
  const away = final.awayScore;

  switch (marketId) {
    case "winner": {
      const picked = pickedWinner(final, optionId);
      if (picked == null) return "VOID";
      return picked === winnerOutcome(home, away) ? "WON" : "LOST";
    }
    case "totals": {
      const isOver = home + away > 2.5;
      if (optionId === "over") return isOver ? "WON" : "LOST";
      if (optionId === "under") return isOver ? "LOST" : "WON";
      return "VOID";
    }
    case "btts": {
      const both = home > 0 && away > 0;
      if (optionId === "yes") return both ? "WON" : "LOST";
      if (optionId === "no") return both ? "LOST" : "WON";
      return "VOID";
    }
    case "chaos": {
      if (final.goals === undefined) return "VOID"; // stat unavailable (empty array is valid)
      const lateGoal = final.goals.some((g) => g.minute > LATE_GOAL_MINUTE);
      if (optionId === "yes") return lateGoal ? "WON" : "LOST";
      if (optionId === "no") return lateGoal ? "LOST" : "WON";
      return "VOID";
    }
    default:
      return "VOID";
  }
}

// Per-market lock. Today every market locks at the match lock time; this hook
// keeps the seam for market-specific lock rules later (PRD §7).
export function marketLockMs(match: Match, _marketId: MarketId): number {
  return match.lockMs;
}

export function isMarketLocked(match: Match, marketId: MarketId, nowMs: number): boolean {
  return nowMs >= marketLockMs(match, marketId);
}
