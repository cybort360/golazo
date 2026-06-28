import { describe, it, expect } from "vitest";
import { buildMarkets } from "@/lib/predict/markets";
import type { Match } from "@/lib/predict/types";

const match: Match = {
  id: "GM041", competition: "World Cup", round: "Group J",
  kickoffMs: 0, lockMs: 0, state: "LIVE", minute: 67,
  home: { ticker: "ARG", name: "Argentina", flagCode: "ar" },
  away: { ticker: "ESP", name: "Spain", flagCode: "es" },
  homeScore: 1, awayScore: 1,
};

describe("buildMarkets", () => {
  it("returns the 4 MVP markets in order", () => {
    const ids = buildMarkets(match).map((m) => m.id);
    expect(ids).toEqual(["winner", "totals", "btts", "chaos"]);
  });

  it("winner options are home / draw / away by ticker", () => {
    const winner = buildMarkets(match)[0];
    expect(winner.options.map((o) => o.id)).toEqual(["ARG", "draw", "ESP"]);
    expect(winner.options.map((o) => o.label)).toEqual(["ARG", "Draw", "ESP"]);
  });

  it("marks chaos as the hero with a question", () => {
    const chaos = buildMarkets(match).find((m) => m.id === "chaos")!;
    expect(chaos.hero).toBe(true);
    expect(chaos.question).toBe("Goal after the 80th minute?");
  });
});
