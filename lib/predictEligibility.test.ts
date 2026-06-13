import { describe, it, expect } from "vitest";
import { isPotEligible } from "@/lib/predictEligibility";

describe("isPotEligible", () => {
  it("is open to everyone when the gate is off (threshold 0 or unset)", () => {
    expect(isPotEligible(null, 0)).toBe(true);
    expect(isPotEligible(0, 0)).toBe(true);
    expect(isPotEligible(5, Number.NaN)).toBe(true);
  });

  it("requires the balance to meet the threshold when the gate is on", () => {
    expect(isPotEligible(1000, 1000)).toBe(true);
    expect(isPotEligible(1500, 1000)).toBe(true);
    expect(isPotEligible(999, 1000)).toBe(false);
  });

  it("treats an unknown balance as not eligible when gated", () => {
    expect(isPotEligible(null, 1000)).toBe(false);
  });
});
