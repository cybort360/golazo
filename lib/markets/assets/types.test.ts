import { describe, it, expect } from "vitest";
import { formatAmount, parseAmount, GOLAZO_SPL, NATIVE_SOL } from "@/lib/markets/assets/types";

describe("asset amount math", () => {
  it("formats base units to human GOLAZO (6 decimals)", () => {
    expect(formatAmount(1_500_000n, 6)).toBe("1.5");
    expect(formatAmount(1_000_000n, 6)).toBe("1");
    expect(formatAmount(0n, 6)).toBe("0");
    expect(formatAmount(1_234_567n, 6, 2)).toBe("1.23");
  });

  it("parses human amounts to base units", () => {
    expect(parseAmount("1.5", 6)).toBe(1_500_000n);
    expect(parseAmount("10", 6)).toBe(10_000_000n);
    expect(parseAmount("0.000001", 6)).toBe(1n);
  });

  it("rejects malformed amounts and over-precise input", () => {
    expect(() => parseAmount("abc", 6)).toThrow(/invalid amount/);
    expect(() => parseAmount("1.1234567", 6)).toThrow(/too many decimals/);
  });

  it("round-trips parse/format", () => {
    expect(formatAmount(parseAmount("42.25", 6), 6)).toBe("42.25");
  });

  it("marks the SPL asset implemented and native-SOL not implemented", () => {
    expect(GOLAZO_SPL.implemented).toBe(true);
    expect(GOLAZO_SPL.decimals).toBe(6);
    expect(NATIVE_SOL.implemented).toBe(false);
  });
});
