import { describe, it, expect } from "vitest";
import { estimatePayout, impliedProbability, impliedOdds } from "@/lib/markets/payout";

describe("parimutuel payout", () => {
  it("returns the whole pool when you are the only staker", () => {
    // stake 100 YES, no NO, empty pool -> payout 100 (you get your own stake)
    expect(estimatePayout(1, 100n, 0n, 0n)).toBe(100n);
  });

  it("splits the pool pro-rata on the winning side", () => {
    // YES has 100 already, NO has 50; you add 100 to YES.
    // yesAfter=200, total=250 -> payout = 100*250/200 = 125
    expect(estimatePayout(1, 100n, 100n, 50n)).toBe(125n);
  });

  it("pays more when backing the underdog side", () => {
    // back NO (the smaller side) -> higher multiple
    const noPayout = estimatePayout(0, 50n, 200n, 50n); // 50*300/100 = 150
    expect(noPayout).toBe(150n);
  });

  it("returns 0 for a non-positive stake", () => {
    expect(estimatePayout(1, 0n, 10n, 10n)).toBe(0n);
  });

  it("implied probability is 0.5 on an empty pool and weights with stake", () => {
    expect(impliedProbability(1, 0n, 0n)).toBe(0.5);
    expect(impliedProbability(1, 75n, 25n)).toBeCloseTo(0.75);
  });

  it("implied odds invert probability", () => {
    expect(impliedOdds(1, 50n, 50n)).toBeCloseTo(2);
  });
});
