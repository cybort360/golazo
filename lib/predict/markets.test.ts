import { describe, it, expect } from "vitest";
import { buildMarkets } from "@/lib/predict/markets";
import type { Match } from "@/lib/predict/types";

const match: Match = {
  id: "ABLRVR", competition: "Premier", round: "Wk 31",
  kickoffMs: 0, lockMs: 0, state: "LIVE", minute: 67, phaseLabel: "2nd half",
  home: { ticker: "ABL", name: "Albion", flagCode: "gb-eng", color: "#dc2626" },
  away: { ticker: "RVR", name: "Rovers", flagCode: "gb-eng", color: "#2563eb" },
  homeScore: 1, awayScore: 1,
};

describe("buildMarkets", () => {
  it("returns the 4 MVP markets in order", () => {
    const ids = buildMarkets(match).map((m) => m.id);
    expect(ids).toEqual(["winner", "totals", "btts", "chaos"]);
  });

  it("winner options carry id by ticker and label by name", () => {
    const winner = buildMarkets(match)[0];
    expect(winner.options.map((o) => o.id)).toEqual(["ABL", "draw", "RVR"]);
    expect(winner.options.map((o) => o.label)).toEqual(["Albion", "Draw", "Rovers"]);
  });

  it("marks chaos as the hero with a question and reward badge", () => {
    const chaos = buildMarkets(match).find((m) => m.id === "chaos")!;
    expect(chaos.hero).toBe(true);
    expect(chaos.question).toBe("Goal after the 80th minute?");
    expect(chaos.rewardBadge).toBe("2× POINTS");
  });
});
