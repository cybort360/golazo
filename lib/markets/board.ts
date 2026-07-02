import type { Match } from "@/lib/predict/types";

// Market Mode board model. Each sub-market (Winner / Totals / Goals) is a set of
// mutually-exclusive OUTCOMES, and each outcome is its own on-chain binary market
// (backing it = a YES stake). The board reads every outcome's pool total and
// shows the live stake SHARE (each outcome's pool ÷ the sub-market total, summing
// to 100%) plus the pari-mutuel odds (total ÷ that outcome's pool).

export type SubMarketId = "winner" | "totals" | "btts";

export interface BoardOutcome {
  id: string; // on-chain market_id + Merkle stat key, stable across a match
  label: string;
}

export interface SubMarket {
  id: SubMarketId;
  tab: string;
  note?: string; // e.g. the totals line "2.5"
  question: string;
  outcomes: BoardOutcome[];
}

export const TOTALS_LINE = 2.5;

export function buildSubMarkets(match: Match): SubMarket[] {
  return [
    {
      id: "winner",
      tab: "Winner",
      question: "Match winner",
      outcomes: [
        { id: "win_home", label: match.home.name },
        { id: "win_draw", label: "Draw" },
        { id: "win_away", label: match.away.name },
      ],
    },
    {
      id: "totals",
      tab: "Totals",
      note: String(TOTALS_LINE),
      question: `Total goals over/under ${TOTALS_LINE}`,
      outcomes: [
        { id: "tot_over", label: "Over" },
        { id: "tot_under", label: "Under" },
      ],
    },
    {
      id: "btts",
      tab: "BTTS",
      question: "Both teams to score?",
      outcomes: [
        { id: "gg_yes", label: "Yes" },
        { id: "gg_no", label: "No" },
      ],
    },
  ];
}

/** Every outcome id across all sub-markets (used to build the match Merkle set). */
export function allOutcomeIds(match: Match): string[] {
  return buildSubMarkets(match).flatMap((s) => s.outcomes.map((o) => o.id));
}

export interface OutcomeStat {
  id: string;
  label: string;
  stake: bigint;
  share: number; // 0..1 of the sub-market total
  odds: number | null; // pari-mutuel gross multiplier; null when no stake on it
}

export interface BoardView {
  rows: OutcomeStat[];
  total: bigint;
  leaderId: string | null; // outcome with the most stake (null if pool empty)
}

/** Compute stake shares + pari-mutuel odds for a sub-market's outcomes. */
export function computeBoard(outcomes: { id: string; label: string; stake: bigint }[]): BoardView {
  const total = outcomes.reduce((s, o) => s + o.stake, 0n);
  let leaderId: string | null = null;
  let leaderStake = 0n;
  const rows = outcomes.map((o) => {
    const share = total > 0n ? Number(o.stake) / Number(total) : 0;
    const odds = o.stake > 0n ? Number(total) / Number(o.stake) : null;
    if (o.stake > leaderStake) {
      leaderStake = o.stake;
      leaderId = o.id;
    }
    return { id: o.id, label: o.label, stake: o.stake, share, odds };
  });
  return { rows, total, leaderId: total > 0n ? leaderId : null };
}

export function formatShare(share: number, hasStakes: boolean): string {
  if (!hasStakes) return "—";
  return `${Math.round(share * 100)}%`;
}

export function formatOdds(odds: number | null): string {
  if (odds == null) return "—";
  return odds.toFixed(2);
}

// Demo settlement resolution (mock adapter: 2–1 home win → 3 goals, both scored).
// Keyed by outcome id (1 = the outcome happened / YES, 0 = NO).
export function demoStats(): Record<string, 0 | 1> {
  return {
    win_home: 1,
    win_draw: 0,
    win_away: 0,
    tot_over: 1,
    tot_under: 0,
    gg_yes: 1,
    gg_no: 0,
  };
}
