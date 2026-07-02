import { describe, it, expect } from "vitest";
import { computeBoard, formatShare, formatOdds, demoStats, buildSubMarkets, allOutcomeIds } from "@/lib/markets/board";
import type { Match } from "@/lib/predict/types";

const match = {
  id: "m1",
  competition: "World Cup",
  round: "Group C",
  kickoffMs: 0,
  lockMs: 0,
  state: "PRE",
  minute: null,
  phaseLabel: null,
  home: { ticker: "ESP", name: "Spain", flagCode: "es", color: "#c00" },
  away: { ticker: "AUT", name: "Austria", flagCode: "at", color: "#c00" },
  homeScore: null,
  awayScore: null,
} as unknown as Match;

describe("computeBoard", () => {
  it("computes stake shares that reflect the pool distribution", () => {
    const v = computeBoard([
      { id: "win_home", label: "Spain", stake: 740n },
      { id: "win_draw", label: "Draw", stake: 170n },
      { id: "win_away", label: "Austria", stake: 90n },
    ]);
    expect(v.total).toBe(1000n);
    expect(v.leaderId).toBe("win_home");
    expect(Math.round(v.rows[0].share * 100)).toBe(74);
    expect(Math.round(v.rows[1].share * 100)).toBe(17);
    expect(Math.round(v.rows[2].share * 100)).toBe(9);
    // pari-mutuel odds = total / stake
    expect(v.rows[0].odds).toBeCloseTo(1.35, 2);
    expect(v.rows[2].odds).toBeCloseTo(11.11, 2);
  });

  it("handles an empty pool with no leader and no odds", () => {
    const v = computeBoard([
      { id: "a", label: "A", stake: 0n },
      { id: "b", label: "B", stake: 0n },
    ]);
    expect(v.total).toBe(0n);
    expect(v.leaderId).toBeNull();
    expect(v.rows[0].odds).toBeNull();
    expect(formatShare(v.rows[0].share, false)).toBe("—");
    expect(formatOdds(v.rows[0].odds)).toBe("—");
  });

  it("formats shares and odds", () => {
    expect(formatShare(0.74, true)).toBe("74%");
    expect(formatOdds(1.351)).toBe("1.35");
  });
});

describe("sub-market model", () => {
  it("exposes winner (3-way), totals, goals with unique outcome ids", () => {
    const subs = buildSubMarkets(match);
    expect(subs.map((s) => s.id)).toEqual(["winner", "totals", "btts"]);
    expect(subs[0].outcomes.map((o) => o.label)).toEqual(["Spain", "Draw", "Austria"]);
    const ids = allOutcomeIds(match);
    expect(new Set(ids).size).toBe(ids.length); // all unique
    // every outcome id has a demo resolution
    const stats = demoStats();
    for (const id of ids) expect(stats[id]).toBeDefined();
  });
});
