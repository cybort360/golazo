import type { TxlineFinalResult, TxlineMatchState } from "@/lib/txline/client";
import type { MarketId } from "@/lib/predict/types";
import type { MatchFinal } from "@/lib/predict/resolve";

// Deterministic match-state + settlement rules (PRD §9). Pure: maps a TxLINE
// state (+ a market's stat availability) to whether/how we settle, so postponed/
// suspended/void cases never freeze or mis-settle and re-running is idempotent.

export type SettlePhase = "PENDING" | "SETTLE" | "VOID";

/**
 * Whether a fixture can settle now.
 * - FT → SETTLE.
 * - VOID (cancelled / abandoned without an official final) → VOID everything.
 * - POSTPONED / SUSPENDED / NOT_STARTED / LIVE / HT → hold PENDING, unless an
 *   official final has arrived out-of-band (abandoned-with-final) → SETTLE.
 */
export function settlePhase(state: TxlineMatchState, hasFinal = false): SettlePhase {
  switch (state) {
    case "FT":
      return "SETTLE";
    case "VOID":
      return "VOID";
    case "NOT_STARTED":
    case "LIVE":
    case "HT":
    case "SUSPENDED":
    case "POSTPONED":
      return hasFinal ? "SETTLE" : "PENDING";
  }
}

// Stat keys each market needs to resolve. If any is flagged unreliable in the
// TxLINE final, that MARKET voids only (not the whole match).
const REQUIRED_STATS: Record<MarketId, string[]> = {
  winner: ["home_goals", "away_goals"],
  totals: ["total_goals"],
  btts: ["btts"],
  chaos: ["late_goal"],
};

export const MARKET_IDS: MarketId[] = ["winner", "totals", "btts", "chaos"];

export function marketAvailable(final: TxlineFinalResult, marketId: MarketId): boolean {
  return REQUIRED_STATS[marketId].every((k) => final.available[k] !== false);
}

export function availabilityMap(final: TxlineFinalResult): Partial<Record<MarketId, boolean>> {
  const out: Partial<Record<MarketId, boolean>> = {};
  for (const m of MARKET_IDS) out[m] = marketAvailable(final, m);
  return out;
}

/** Bridge a verified TxLINE final into the pure resolver input. */
export function toMatchFinal(
  final: TxlineFinalResult,
  homeTicker?: string,
  awayTicker?: string,
): MatchFinal {
  return {
    state: final.state,
    homeScore: final.homeScore,
    awayScore: final.awayScore,
    homeTicker,
    awayTicker,
    goals: final.goals,
    available: availabilityMap(final),
  };
}

/** User-facing status label derived from the current state (PRD §9 UI vocab). */
export function uiStatus(state: TxlineMatchState, minute: number | null): string {
  switch (state) {
    case "NOT_STARTED":
      return "NOT STARTED";
    case "LIVE":
      return minute != null ? `LIVE ${minute}'` : "LIVE";
    case "HT":
      return "HT";
    case "FT":
      return "FT";
    case "SUSPENDED":
      return "SUSPENDED";
    case "POSTPONED":
      return "POSTPONED";
    case "VOID":
      return "VOID";
  }
}
