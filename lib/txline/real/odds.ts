import type { TxlineOdds } from "@/lib/txline/client";

// Pure mapper: TxLINE odds-snapshot rows → normalized implied probabilities.
// Probed shape (devnet, 2026-06-30): each row carries a SuperOddsType, PriceNames
// + Prices (decimal odds × 1000) and a demargined Pct (sums to 100). We prefer
// the full-match line and the latest timestamp per market.

export interface RawOddsRow {
  FixtureId: number;
  Ts: number;
  SuperOddsType: string;
  PriceNames: string[];
  Prices: number[];
  Pct: string[];
  MarketParameters: string | null;
  MarketPeriod: string | null;
}

// Full match = no period qualifier (first-half rows carry "half=1", etc.).
function isFullMatch(period: string | null | undefined): boolean {
  return !period || /^match$/i.test(period) || period === "half=0";
}

// Prefer the demargined Pct (already sums to 100); fall back to deriving implied
// probabilities from the decimal odds and normalizing out the bookmaker margin.
function probsOf(row: RawOddsRow): number[] | null {
  if (row.Pct && row.Pct.length === row.PriceNames.length && row.Pct.every((p) => p !== "NA")) {
    const nums = row.Pct.map(Number);
    if (nums.every((n) => Number.isFinite(n))) return nums.map((n) => n / 100);
  }
  if (row.Prices && row.Prices.length === row.PriceNames.length && row.Prices.every((p) => p > 0)) {
    const raw = row.Prices.map((p) => 1000 / p); // odds are ×1000
    const sum = raw.reduce((a, b) => a + b, 0);
    if (sum > 0) return raw.map((r) => r / sum);
  }
  return null;
}

function latest(rows: RawOddsRow[]): RawOddsRow | null {
  if (rows.length === 0) return null;
  const full = rows.filter((r) => isFullMatch(r.MarketPeriod));
  const pool = full.length ? full : rows;
  return pool.reduce((a, b) => (b.Ts > a.Ts ? b : a));
}

function lineOf(params: string | null): number | null {
  const m = (params ?? "").match(/line=(-?[\d.]+)/);
  return m ? Number(m[1]) : null;
}

export function parseOdds(fixtureId: string, rows: RawOddsRow[], p1IsHome: boolean): TxlineOdds | null {
  if (!rows || rows.length === 0) return null;
  const out: TxlineOdds = { fixtureId, updatedMs: Math.max(...rows.map((r) => r.Ts || 0)) };

  // 1X2 → winner (part1 / draw / part2), oriented by Participant1IsHome.
  const w = latest(rows.filter((r) => r.SuperOddsType === "1X2_PARTICIPANT_RESULT"));
  if (w) {
    const probs = probsOf(w);
    const i1 = w.PriceNames.indexOf("part1");
    const id = w.PriceNames.indexOf("draw");
    const i2 = w.PriceNames.indexOf("part2");
    if (probs && i1 >= 0 && id >= 0 && i2 >= 0) {
      const p1 = probs[i1];
      const draw = probs[id];
      const p2 = probs[i2];
      out.winner = p1IsHome ? { home: p1, draw, away: p2 } : { home: p2, draw, away: p1 };
    }
  }

  // Over/Under 2.5 total goals.
  const totalsRows = rows.filter(
    (r) => r.SuperOddsType === "OVERUNDER_PARTICIPANT_GOALS" && lineOf(r.MarketParameters) === 2.5,
  );
  const t = latest(totalsRows);
  if (t) {
    const probs = probsOf(t);
    const io = t.PriceNames.indexOf("over");
    const iu = t.PriceNames.indexOf("under");
    if (probs && io >= 0 && iu >= 0) {
      out.totals = { line: 2.5, over: probs[io], under: probs[iu] };
    }
  }

  if (!out.winner && !out.totals) return null;
  return out;
}
