import { describe, it, expect } from "vitest";
import {
  potBreakdown,
  gameweekWindow,
  validateEntryFee,
  validateLeagueName,
  MIN_ENTRY_FEE,
} from "@/lib/fpl/league";
import { buildGameweeks } from "@/lib/fpl/gameweeks";

describe("potBreakdown", () => {
  it("splits pot, 10% rake, and net to the winner", () => {
    expect(potBreakdown(1000, 4)).toEqual({ pot: 4000, rake: 400, net: 3600 });
  });

  it("floors the rake so the house never over-takes", () => {
    // pot 999, 10% = 99.9 → rake 99, net 900
    expect(potBreakdown(333, 3)).toEqual({ pot: 999, rake: 99, net: 900 });
  });

  it("honours a custom rake", () => {
    expect(potBreakdown(1000, 2, 0)).toEqual({ pot: 2000, rake: 0, net: 2000 });
  });
});

describe("gameweekWindow", () => {
  const gws = buildGameweeks();
  it("runs from the start gameweek through the last", () => {
    expect(gameweekWindow("GW3", gws).map((g) => g.id)).toEqual([
      "GW3", "GW4", "GW5", "GW6", "GW7", "GW8",
    ]);
    expect(gameweekWindow("GW1", gws)).toHaveLength(8);
  });
  it("is empty for an unknown gameweek", () => {
    expect(gameweekWindow("GW99", gws)).toEqual([]);
  });
});

describe("validation", () => {
  it("rejects an entry below the floor", () => {
    expect(validateEntryFee(MIN_ENTRY_FEE - 1).ok).toBe(false);
    expect(validateEntryFee(MIN_ENTRY_FEE).ok).toBe(true);
    expect(validateEntryFee("lots").ok).toBe(false);
  });
  it("bounds the league name length", () => {
    expect(validateLeagueName("ab").ok).toBe(false);
    expect(validateLeagueName("Friday Night League").ok).toBe(true);
  });
});
