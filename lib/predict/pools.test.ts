import { describe, it, expect } from "vitest";
import { prizeKindLabel, formatCloses } from "@/lib/predict/pools";

describe("prizeKindLabel", () => {
  it("maps prize kinds to display labels", () => {
    expect(prizeKindLabel("merch")).toBe("Merch");
    expect(prizeKindLabel("access")).toBe("Access");
    expect(prizeKindLabel("perk")).toBe("Perk");
  });
});

describe("formatCloses", () => {
  const now = 1_000_000_000_000;
  it("reports days, hours and minutes remaining", () => {
    expect(formatCloses(now + 2 * 24 * 3600_000, now)).toBe("Closes in 2d");
    expect(formatCloses(now + 5 * 3600_000, now)).toBe("Closes in 5h");
    expect(formatCloses(now + 20 * 60_000, now)).toBe("Closes in 20m");
  });
  it("reports closed once the deadline has passed", () => {
    expect(formatCloses(now - 1000, now)).toBe("Closed");
  });
});
