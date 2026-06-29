import { describe, it, expect } from "vitest";
import { isMarketId, isPickOpen, MARKET_IDS } from "@/lib/predict/pick-rules";

describe("isMarketId", () => {
  it("accepts the 4 MVP markets and rejects others", () => {
    expect(MARKET_IDS).toEqual(["winner", "totals", "btts", "chaos"]);
    expect(isMarketId("chaos")).toBe(true);
    expect(isMarketId("corners")).toBe(false);
  });
});

describe("isPickOpen", () => {
  it("open before lock, closed at/after lock", () => {
    expect(isPickOpen(1000, 999)).toBe(true);
    expect(isPickOpen(1000, 1000)).toBe(false);
    expect(isPickOpen(1000, 1001)).toBe(false);
  });
  it("treats an unknown lock as open", () => {
    expect(isPickOpen(null, Date.now())).toBe(true);
  });
});
