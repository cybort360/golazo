import { describe, it, expect } from "vitest";
import { generateLeagueCode, initialsFor, colorFor, rankStandings } from "@/lib/predict/league-util";

describe("generateLeagueCode", () => {
  it("formats as GLZ-XXXXXXXX with unambiguous chars", () => {
    const code = generateLeagueCode(() => 0);
    expect(code).toMatch(/^GLZ-[A-HJ-NP-Z2-9]{8}$/);
  });
  it("defaults to a CSPRNG and produces varied codes", () => {
    expect(generateLeagueCode()).not.toBe(generateLeagueCode());
  });
});

describe("initialsFor", () => {
  it("derives 1-2 letter initials", () => {
    expect(initialsFor("Jordan")).toBe("JO");
    expect(initialsFor("Mikey Smith")).toBe("MS");
    expect(initialsFor("")).toBe("??");
  });
});

describe("colorFor", () => {
  it("is deterministic", () => {
    expect(colorFor("abc")).toBe(colorFor("abc"));
  });
});

describe("rankStandings", () => {
  it("ranks by points desc and computes accuracy", () => {
    const ranked = rankStandings([
      { userId: "a", name: "Ann", points: 100, won: 2, settled: 4 },
      { userId: "b", name: "Bo", points: 300, won: 3, settled: 3 },
      { userId: "c", name: "Cy", points: 200, won: 1, settled: 2 },
    ]);
    expect(ranked.map((r) => r.userId)).toEqual(["b", "c", "a"]);
    expect(ranked.map((r) => r.rank)).toEqual([1, 2, 3]);
    expect(ranked[0].accuracy).toBe(1); // 3/3
    expect(ranked[2].accuracy).toBe(0.5); // 2/4
  });
  it("handles a member with no settled picks (0 accuracy, no divide-by-zero)", () => {
    const [r] = rankStandings([{ userId: "x", name: "X", points: 0, won: 0, settled: 0 }]);
    expect(r.accuracy).toBe(0);
  });
});
