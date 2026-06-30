import { describe, it, expect } from "vitest";
import { parseOdds, type RawOddsRow } from "@/lib/txline/real/odds";

// Shapes from the live devnet odds feed (probed 2026-06-30).
function row(over: Partial<RawOddsRow>): RawOddsRow {
  return {
    FixtureId: 18175397,
    Ts: 1000,
    SuperOddsType: "1X2_PARTICIPANT_RESULT",
    PriceNames: ["part1", "draw", "part2"],
    Prices: [4554, 2305, 2885],
    Pct: ["21.959", "43.384", "34.662"],
    MarketParameters: null,
    MarketPeriod: null,
    ...over,
  };
}

describe("parseOdds", () => {
  it("maps 1X2 demargined Pct to home/draw/away when part1 is home", () => {
    const o = parseOdds("18175397", [row({})], true)!;
    expect(o.winner).toBeTruthy();
    expect(Math.round(o.winner!.home * 1000)).toBe(220); // 21.96%
    expect(Math.round(o.winner!.draw * 1000)).toBe(434);
    expect(Math.round(o.winner!.away * 1000)).toBe(347);
  });

  it("flips home/away when part1 is NOT home", () => {
    const o = parseOdds("18175397", [row({})], false)!;
    expect(Math.round(o.winner!.home * 1000)).toBe(347); // part2 → home
    expect(Math.round(o.winner!.away * 1000)).toBe(220);
  });

  it("prefers the full-match line over a first-half line", () => {
    const half = row({ MarketPeriod: "half=1", Ts: 5000, Pct: ["10.0", "10.0", "80.0"] });
    const full = row({ MarketPeriod: null, Ts: 1000 });
    const o = parseOdds("18175397", [half, full], true)!;
    expect(Math.round(o.winner!.home * 1000)).toBe(220); // from the full-match row
  });

  it("derives probabilities from decimal odds when Pct is NA", () => {
    const o = parseOdds("18175397", [row({ Pct: ["NA", "NA", "NA"] })], true)!;
    // 1000/price normalized: (1/4.554, 1/2.305, 1/2.885) → ~0.22/0.43/0.35
    expect(Math.round(o.winner!.home * 100)).toBe(22);
    expect(Math.round(o.winner!.draw * 100)).toBe(43);
  });

  it("parses over/under 2.5 and ignores other lines", () => {
    const ou25 = row({
      SuperOddsType: "OVERUNDER_PARTICIPANT_GOALS",
      PriceNames: ["over", "under"],
      Prices: [1900, 1900],
      Pct: ["48.0", "52.0"],
      MarketParameters: "line=2.5",
    });
    const ou15 = row({
      SuperOddsType: "OVERUNDER_PARTICIPANT_GOALS",
      PriceNames: ["over", "under"],
      Pct: ["70.0", "30.0"],
      MarketParameters: "line=1.5",
    });
    const o = parseOdds("18175397", [ou25, ou15], true)!;
    expect(o.totals).toEqual({ line: 2.5, over: 0.48, under: 0.52 });
  });

  it("returns null when no usable markets are present", () => {
    const junk = row({ SuperOddsType: "ASIANHANDICAP_PARTICIPANT_GOALS", PriceNames: ["part1", "part2"], Pct: ["NA", "NA"], Prices: [0, 0] });
    expect(parseOdds("x", [junk], true)).toBeNull();
    expect(parseOdds("x", [], true)).toBeNull();
  });
});
