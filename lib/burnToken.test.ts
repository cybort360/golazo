// @vitest-environment node
import { describe, it, expect } from "vitest";
import { toBaseUnits } from "@/lib/burnToken";

describe("toBaseUnits", () => {
  it("converts whole tokens", () => {
    expect(toBaseUnits("1", 9)).toBe(BigInt("1000000000"));
    expect(toBaseUnits("100", 6)).toBe(BigInt("100000000"));
  });

  it("converts fractional amounts without float drift", () => {
    expect(toBaseUnits("1.5", 9)).toBe(BigInt("1500000000"));
    expect(toBaseUnits("0.000000001", 9)).toBe(BigInt(1));
  });

  it("stays exact for large burns past Number.MAX_SAFE_INTEGER", () => {
    // 500M tokens at 9 decimals = 5e17, which float math would round wrong.
    expect(toBaseUnits("500000000", 9)).toBe(BigInt("500000000000000000"));
  });

  it("pads short fractions and trims whitespace", () => {
    expect(toBaseUnits("  2.25  ", 6)).toBe(BigInt("2250000"));
  });

  it("rejects more decimal places than the mint supports", () => {
    expect(() => toBaseUnits("1.1234567", 6)).toThrow(/decimals/);
  });

  it("rejects zero, negatives, and junk", () => {
    expect(() => toBaseUnits("0", 9)).toThrow();
    expect(() => toBaseUnits("-1", 9)).toThrow();
    expect(() => toBaseUnits("abc", 9)).toThrow();
    expect(() => toBaseUnits("", 9)).toThrow();
  });
});
