import { describe, it, expect } from "vitest";
import { isMarketId, isPickOpen, MARKET_IDS, existingPicksToState } from "@/lib/predict/pick-rules";

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
  it("locks once the match has kicked off, even before the scheduled lock", () => {
    // now < lockAt but the match is already live → closed
    expect(isPickOpen(2000, 1000, "LIVE")).toBe(false);
    expect(isPickOpen(2000, 1000, "HT")).toBe(false);
    expect(isPickOpen(2000, 1000, "FT")).toBe(false);
    expect(isPickOpen(null, 1000, "LIVE")).toBe(false);
  });
  it("stays open while NOT_STARTED and before lock", () => {
    expect(isPickOpen(2000, 1000, "NOT_STARTED")).toBe(true);
  });
});

describe("existingPicksToState", () => {
  it("maps stored rows to a per-market selection, ignoring unknown markets", () => {
    expect(
      existingPicksToState([
        { marketId: "winner", optionId: "ARG" },
        { marketId: "totals", optionId: "over" },
        { marketId: "corners", optionId: "9plus" },
      ]),
    ).toEqual({ winner: "ARG", totals: "over" });
  });
  it("returns {} for no picks", () => {
    expect(existingPicksToState([])).toEqual({});
  });
});
