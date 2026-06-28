import { describe, it, expect } from "vitest";
import {
  matchStateLabel, scoreLabel, formatPoints, formatAccuracy,
} from "@/lib/predict/labels";
import type { Match } from "@/lib/predict/types";

const base: Match = {
  id: "x", competition: "Premier", round: "Wk 31",
  kickoffMs: 0, lockMs: 0, state: "LIVE", minute: 67, phaseLabel: "2nd half",
  home: { ticker: "ABL", name: "Albion", flagCode: "gb-eng", color: "#dc2626" },
  away: { ticker: "RVR", name: "Rovers", flagCode: "gb-eng", color: "#2563eb" },
  homeScore: 1, awayScore: 1,
};

describe("matchStateLabel", () => {
  it("shows live minute", () => {
    expect(matchStateLabel(base)).toBe("LIVE 67'");
  });
  it("falls back to LIVE without a minute", () => {
    expect(matchStateLabel({ ...base, minute: null })).toBe("LIVE");
  });
  it("maps terminal/paused states", () => {
    expect(matchStateLabel({ ...base, state: "FT" })).toBe("FT");
    expect(matchStateLabel({ ...base, state: "HT" })).toBe("HT");
    expect(matchStateLabel({ ...base, state: "POSTPONED" })).toBe("POSTPONED");
  });
  it("is empty before kickoff", () => {
    expect(matchStateLabel({ ...base, state: "NOT_STARTED" })).toBe("");
  });
});

describe("scoreLabel", () => {
  it("renders a score", () => expect(scoreLabel(base)).toBe("1 – 1"));
  it("is empty without scores", () =>
    expect(scoreLabel({ ...base, homeScore: null })).toBe(""));
});

describe("formatters", () => {
  it("formats points with thousands", () => expect(formatPoints(1720)).toBe("1,720"));
  it("formats accuracy as a percent", () => expect(formatAccuracy(0.68)).toBe("68%"));
});
