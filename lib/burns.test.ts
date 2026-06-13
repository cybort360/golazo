import { describe, it, expect } from "vitest";
import { computeBurnPct, BURN_INITIAL_SUPPLY } from "@/lib/burns";

describe("computeBurnPct", () => {
  it("computes the percent burned from current supply", () => {
    // 900M left of a 1B launch → 10% burned.
    expect(computeBurnPct(900_000_000)).toBeCloseTo(10);
  });

  it("is 0% when nothing has been burned", () => {
    expect(computeBurnPct(BURN_INITIAL_SUPPLY)).toBe(0);
  });

  it("is 100% when fully burned", () => {
    expect(computeBurnPct(0)).toBe(100);
  });

  it("clamps to 0 if supply somehow exceeds the initial", () => {
    expect(computeBurnPct(BURN_INITIAL_SUPPLY * 1.1)).toBe(0);
  });

  it("returns null when supply is unknown or invalid", () => {
    expect(computeBurnPct(null)).toBeNull();
    expect(computeBurnPct(Number.NaN)).toBeNull();
  });

  it("respects a custom initial supply", () => {
    expect(computeBurnPct(250, 1000)).toBeCloseTo(75);
  });
});
