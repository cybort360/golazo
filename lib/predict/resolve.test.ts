import { describe, it, expect } from "vitest";
import {
  resolvePick,
  matchToFinal,
  marketLockMs,
  isMarketLocked,
  LATE_GOAL_MINUTE,
  type MatchFinal,
} from "@/lib/predict/resolve";
import type { Match } from "@/lib/predict/types";

// A 2-1 home win with a late winner in the 84th minute.
const base: MatchFinal = {
  state: "FT",
  homeScore: 2,
  awayScore: 1,
  homeTicker: "ABL",
  awayTicker: "RVR",
  goals: [
    { minute: 12, team: "home" },
    { minute: 55, team: "away" },
    { minute: 84, team: "home" },
  ],
};

describe("resolvePick · winner", () => {
  it("WON when the picked side matches the outcome (home win)", () => {
    expect(resolvePick(base, "winner", "ABL")).toBe("WON");
    expect(resolvePick(base, "winner", "home")).toBe("WON"); // literal alias
  });
  it("LOST when the picked side is wrong", () => {
    expect(resolvePick(base, "winner", "RVR")).toBe("LOST");
    expect(resolvePick(base, "winner", "draw")).toBe("LOST");
  });
  it("resolves a draw", () => {
    const draw: MatchFinal = { ...base, homeScore: 1, awayScore: 1 };
    expect(resolvePick(draw, "winner", "draw")).toBe("WON");
    expect(resolvePick(draw, "winner", "ABL")).toBe("LOST");
  });
  it("resolves an away win", () => {
    const away: MatchFinal = { ...base, homeScore: 0, awayScore: 2 };
    expect(resolvePick(away, "winner", "RVR")).toBe("WON");
    expect(resolvePick(away, "winner", "away")).toBe("WON");
  });
  it("VOIDs an unknown option (cannot map to an outcome)", () => {
    expect(resolvePick(base, "winner", "???")).toBe("VOID");
  });
});

describe("resolvePick · totals (O/U 2.5)", () => {
  it("Over WON / Under LOST when total > 2.5", () => {
    expect(resolvePick(base, "totals", "over")).toBe("WON"); // 2+1=3
    expect(resolvePick(base, "totals", "under")).toBe("LOST");
  });
  it("Under WON / Over LOST when total < 2.5", () => {
    const low: MatchFinal = { ...base, homeScore: 1, awayScore: 1 }; // 2
    expect(resolvePick(low, "totals", "under")).toBe("WON");
    expect(resolvePick(low, "totals", "over")).toBe("LOST");
  });
});

describe("resolvePick · btts", () => {
  it("Yes WON when both teams scored", () => {
    expect(resolvePick(base, "btts", "yes")).toBe("WON"); // 2-1
    expect(resolvePick(base, "btts", "no")).toBe("LOST");
  });
  it("No WON when a team failed to score", () => {
    const cs: MatchFinal = { ...base, homeScore: 3, awayScore: 0, goals: [] };
    expect(resolvePick(cs, "btts", "no")).toBe("WON");
    expect(resolvePick(cs, "btts", "yes")).toBe("LOST");
  });
});

describe("resolvePick · chaos (goal after the 80th minute)", () => {
  it("Yes WON from a goal-timestamp fixture with an 84' goal", () => {
    expect(resolvePick(base, "chaos", "yes")).toBe("WON");
    expect(resolvePick(base, "chaos", "no")).toBe("LOST");
  });
  it("No WON when all goals are at/before the 80th minute", () => {
    const early: MatchFinal = {
      ...base,
      goals: [
        { minute: 12, team: "home" },
        { minute: 80, team: "away" }, // the 80th minute itself is NOT "after"
      ],
    };
    expect(resolvePick(early, "chaos", "no")).toBe("WON");
    expect(resolvePick(early, "chaos", "yes")).toBe("LOST");
  });
  it("treats an empty goal list as available (0-0 => No WON)", () => {
    const goalless: MatchFinal = { ...base, homeScore: 0, awayScore: 0, goals: [] };
    expect(resolvePick(goalless, "chaos", "no")).toBe("WON");
  });
  it("80 is the boundary constant", () => {
    expect(LATE_GOAL_MINUTE).toBe(80);
  });
});

describe("resolvePick · MARKET VOID (stat unavailable)", () => {
  it("VOIDs chaos only when goal timestamps are missing", () => {
    const noGoals: MatchFinal = { ...base, goals: undefined };
    expect(resolvePick(noGoals, "chaos", "yes")).toBe("VOID");
    // other markets still resolve from the score
    expect(resolvePick(noGoals, "winner", "ABL")).toBe("WON");
    expect(resolvePick(noGoals, "totals", "over")).toBe("WON");
  });
  it("VOIDs a single market flagged unavailable, not the others", () => {
    const final: MatchFinal = { ...base, available: { totals: false } };
    expect(resolvePick(final, "totals", "over")).toBe("VOID");
    expect(resolvePick(final, "winner", "ABL")).toBe("WON");
  });
});

describe("resolvePick · whole-match VOID", () => {
  it("VOIDs every market when the match is VOID", () => {
    const voided: MatchFinal = { ...base, state: "VOID" };
    for (const m of ["winner", "totals", "btts", "chaos"] as const) {
      expect(resolvePick(voided, m, "yes")).toBe("VOID");
    }
  });
  it("VOIDs when there is no final score", () => {
    const noScore: MatchFinal = { ...base, homeScore: null, awayScore: null };
    expect(resolvePick(noScore, "winner", "ABL")).toBe("VOID");
  });
});

describe("resolvePick · determinism", () => {
  it("returns the same result when called repeatedly", () => {
    const a = resolvePick(base, "chaos", "yes");
    const b = resolvePick(base, "chaos", "yes");
    const c = resolvePick(base, "chaos", "yes");
    expect([a, b, c]).toEqual(["WON", "WON", "WON"]);
  });
});

const match: Match = {
  id: "ABLRVR", competition: "Premier", round: "Wk 31",
  kickoffMs: 1_000_000, lockMs: 900_000, state: "FT", minute: 90, phaseLabel: null,
  home: { ticker: "ABL", name: "Albion", flagCode: "gb-eng", color: "#dc2626" },
  away: { ticker: "RVR", name: "Rovers", flagCode: "gb-eng", color: "#2563eb" },
  homeScore: 2, awayScore: 1,
};

describe("matchToFinal + lock", () => {
  it("carries scores, state and tickers from a Match", () => {
    const f = matchToFinal(match, [{ minute: 84, team: "home" }]);
    expect(f.homeScore).toBe(2);
    expect(f.awayScore).toBe(1);
    expect(f.homeTicker).toBe("ABL");
    expect(f.awayTicker).toBe("RVR");
    expect(resolvePick(f, "chaos", "yes")).toBe("WON");
  });
  it("locks every market at the match lock time", () => {
    for (const m of ["winner", "totals", "btts", "chaos"] as const) {
      expect(marketLockMs(match, m)).toBe(900_000);
      expect(isMarketLocked(match, m, 899_999)).toBe(false);
      expect(isMarketLocked(match, m, 900_000)).toBe(true);
    }
  });
});
