import { describe, it, expect } from "vitest";
import { statusLabel, canStake, canClaim, canRefund, MARKET_STATUS } from "@/lib/markets/status";

describe("market status", () => {
  it("labels each status code", () => {
    expect(statusLabel(MARKET_STATUS.OPEN)).toBe("Open");
    expect(statusLabel(MARKET_STATUS.SETTLED)).toBe("Settled");
    expect(statusLabel(MARKET_STATUS.VOID)).toBe("Void");
  });

  it("allows staking only while open and before lock", () => {
    const future = Math.floor(Date.now() / 1000) + 3600;
    const past = Math.floor(Date.now() / 1000) - 10;
    expect(canStake(MARKET_STATUS.OPEN, future)).toBe(true);
    expect(canStake(MARKET_STATUS.OPEN, past)).toBe(false);
    expect(canStake(MARKET_STATUS.LOCKED, future)).toBe(false);
  });

  it("gates claim/refund by terminal status", () => {
    expect(canClaim(MARKET_STATUS.SETTLED)).toBe(true);
    expect(canClaim(MARKET_STATUS.OPEN)).toBe(false);
    expect(canRefund(MARKET_STATUS.VOID)).toBe(true);
    expect(canRefund(MARKET_STATUS.SETTLED)).toBe(false);
  });
});
