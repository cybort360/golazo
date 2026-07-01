import type { ActivePickGroup, MarketId } from "@/lib/predict/types";
import { dbMatchToUi, type DbMatchRow } from "@/lib/predict/map";
import { MARKET_IDS, MARKET_TITLES, isMarketId } from "@/lib/predict/pick-rules";

// Pure builder: pending Prediction rows (+ their match) → the grouped shape the
// "My Picks" list renders. Kept out of the server-only chain so it's unit-testable.

export interface ActivePickRow {
  id: string;
  marketId: string;
  predictionLabel: string;
  createdAt: string | number | Date;
  match: DbMatchRow;
}

function ms(v: string | number | Date): number {
  if (v instanceof Date) return v.getTime();
  if (typeof v === "number") return v;
  const t = new Date(v).getTime();
  return Number.isNaN(t) ? 0 : t;
}

const MARKET_ORDER: Record<MarketId, number> = MARKET_IDS.reduce(
  (acc, id, i) => ({ ...acc, [id]: i }),
  {} as Record<MarketId, number>,
);

/**
 * Group pending picks by match: one group per match (built via dbMatchToUi),
 * picks ordered by the fixed market order, groups ordered by soonest kickoff.
 */
export function groupActivePicks(rows: ActivePickRow[]): ActivePickGroup[] {
  const byMatch = new Map<string, ActivePickGroup>();

  for (const row of rows) {
    if (!isMarketId(row.marketId)) continue;
    const id = row.match.id;
    let group = byMatch.get(id);
    if (!group) {
      group = { match: dbMatchToUi(row.match), picks: [] };
      byMatch.set(id, group);
    }
    group.picks.push({
      pickId: row.id,
      marketId: row.marketId,
      marketTitle: MARKET_TITLES[row.marketId],
      optionLabel: row.predictionLabel,
      createdAtMs: ms(row.createdAt),
    });
  }

  const groups = [...byMatch.values()];
  for (const g of groups) {
    g.picks.sort((a, b) => MARKET_ORDER[a.marketId] - MARKET_ORDER[b.marketId]);
  }
  groups.sort((a, b) => a.match.kickoffMs - b.match.kickoffMs);
  return groups;
}
