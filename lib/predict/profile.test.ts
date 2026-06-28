import { describe, it, expect } from "vitest";
import { buildProfile } from "@/lib/predict/profile";
import type { ProofReceipt } from "@/lib/predict/types";

const ABL = { ticker: "ABL", name: "Albion", flagCode: "gb-eng", color: "#dc2626" };
const RVR = { ticker: "RVR", name: "Rovers", flagCode: "gb-eng", color: "#2563eb" };

function rcpt(p: Partial<ProofReceipt> & Pick<ProofReceipt, "pickId" | "result" | "points" | "marketLabel" | "settledAtMs">): ProofReceipt {
  return {
    predictionLabel: "x", home: ABL, away: RVR, homeScore: 1, awayScore: 0,
    fixtureId: "f", matchState: "FT", statKeys: "", payloadRef: "",
    merkleStatus: "valid", onChainStatus: "valid", txUrl: null,
    ...p,
  };
}

const IDENTITY = {
  handle: "jordan", displayName: "Jordan", initials: "JK", color: "#000",
  tagline: "Prove you know ball.", globalRank: 142,
};

describe("buildProfile", () => {
  it("computes accuracy, points and ignores pending picks", () => {
    const p = buildProfile([
      rcpt({ pickId: "a", result: "WON", points: 50, marketLabel: "total_goals · O2.5", settledAtMs: 3 }),
      rcpt({ pickId: "b", result: "LOST", points: 0, marketLabel: "btts · yes", settledAtMs: 2 }),
      rcpt({ pickId: "c", result: "PENDING", points: 0, marketLabel: "winner · home", settledAtMs: 1 }),
    ], IDENTITY);
    expect(p.totalPicks).toBe(2);
    expect(p.wins).toBe(1);
    expect(p.accuracy).toBe(0.5);
    expect(p.points).toBe(50);
  });

  it("counts the current streak from the most recent settlement backwards", () => {
    const p = buildProfile([
      rcpt({ pickId: "old", result: "WON", points: 10, marketLabel: "winner · home", settledAtMs: 1 }),
      rcpt({ pickId: "mid", result: "LOST", points: 0, marketLabel: "winner · home", settledAtMs: 2 }),
      rcpt({ pickId: "new1", result: "WON", points: 10, marketLabel: "winner · home", settledAtMs: 3 }),
      rcpt({ pickId: "new2", result: "WON", points: 10, marketLabel: "winner · home", settledAtMs: 4 }),
    ], IDENTITY);
    expect(p.currentStreak).toBe(2);
  });

  it("picks the most-played market and the highest-scoring won pick as the upset", () => {
    const p = buildProfile([
      rcpt({ pickId: "a", result: "WON", points: 30, marketLabel: "total_goals · O2.5", settledAtMs: 1 }),
      rcpt({ pickId: "b", result: "WON", points: 30, marketLabel: "total_goals · U2.5", settledAtMs: 2 }),
      rcpt({ pickId: "c", result: "WON", points: 100, marketLabel: "chaos · late_goal", settledAtMs: 3, predictionLabel: "Chaos · Goal after 80'" }),
    ], IDENTITY);
    expect(p.favoriteMarket).toBe("Total goals");
    expect(p.biggestUpset?.points).toBe(100);
    expect(p.biggestUpset?.label).toBe("Chaos · Goal after 80'");
  });
});
