import { describe, it, expect } from "vitest";
import { guestGate } from "@/lib/predict/guestGate";

describe("guestGate", () => {
  it("blocks account-only features for guests", () => {
    const g = guestGate(true);
    expect(g.canMarketMode).toBe(false);
    expect(g.canLeagues).toBe(false);
    expect(g.rankedGlobally).toBe(false);
  });

  it("allows everything for real accounts", () => {
    const a = guestGate(false);
    expect(a.canMarketMode).toBe(true);
    expect(a.canLeagues).toBe(true);
    expect(a.rankedGlobally).toBe(true);
  });
});
