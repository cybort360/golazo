import { describe, it, expect } from "vitest";
import { priceFor, teamTier } from "@/lib/fpl/prices";
import { BUDGET } from "@/lib/fpl/squad";

describe("priceFor", () => {
  it("prices favourites above outsiders for the same position", () => {
    expect(priceFor("BRA", "FWD")).toBeGreaterThan(priceFor("CUW", "FWD"));
  });

  it("defaults unlisted teams to the mid tier", () => {
    expect(teamTier("ZZZ")).toBe(3);
    expect(priceFor("ZZZ", "MID")).toBe(priceFor("GHA", "MID"));
  });

  it("lets you field a full cheap squad under budget", () => {
    // Cheapest legal 15 at tier-4 prices: 2 GK + 5 DEF + 5 MID + 3 FWD.
    const cheap =
      2 * priceFor("CUW", "GK") +
      5 * priceFor("CUW", "DEF") +
      5 * priceFor("CUW", "MID") +
      3 * priceFor("CUW", "FWD");
    expect(cheap).toBeLessThan(BUDGET);
  });

  it("won't let you afford a squad of all premiums", () => {
    const premium =
      2 * priceFor("BRA", "GK") +
      5 * priceFor("BRA", "DEF") +
      5 * priceFor("BRA", "MID") +
      3 * priceFor("BRA", "FWD");
    expect(premium).toBeGreaterThan(BUDGET);
  });
});
