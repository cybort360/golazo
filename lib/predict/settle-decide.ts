import { resolvePick } from "@/lib/predict/resolve";
import { settlePhase, toMatchFinal } from "@/lib/predict/state";
import type { TxlineFinalResult } from "@/lib/txline/client";
import type { MarketId, PickResult } from "@/lib/predict/types";

// Pure settlement decision for one prediction (kept out of the server-only chain
// so it's unit testable). Deterministic: same final + pick → same outcome, which
// is what makes auto-settlement replayable.

// Base points per market. Chaos is the differentiator (PRD §7) → 2× reward.
export const POINTS: Record<MarketId, number> = {
  winner: 40,
  totals: 30,
  btts: 30,
  chaos: 50,
};

export function pointsFor(result: PickResult, marketId: MarketId): number {
  if (result !== "WON") return 0;
  return POINTS[marketId] * (marketId === "chaos" ? 2 : 1);
}

export interface Decision {
  status: PickResult;
  points: number;
  proofRef: string | null;
}

/**
 * Decide a pick's outcome from a verified final. Returns null when the fixture
 * isn't settle-eligible yet (caller leaves it PENDING). VOID restores the entry
 * (0 points); a settled market resolves WON/LOST and awards points.
 */
export function decidePrediction(
  final: TxlineFinalResult | null,
  marketId: MarketId,
  optionId: string,
  tickers: { home?: string; away?: string },
): Decision | null {
  if (!final) return null;
  const phase = settlePhase(final.state, true);
  if (phase === "PENDING") return null;
  if (phase === "VOID") return { status: "VOID", points: 0, proofRef: final.payloadRef };

  const f = toMatchFinal(final, tickers.home, tickers.away);
  const status = resolvePick(f, marketId, optionId);
  return { status, points: pointsFor(status, marketId), proofRef: final.payloadRef };
}
