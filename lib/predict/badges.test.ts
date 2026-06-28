import { describe, it, expect } from "vitest";
import { buildBadges } from "@/lib/predict/badges";
import type { Badge, ProofReceipt } from "@/lib/predict/types";

const ABL = { ticker: "ABL", name: "Albion", flagCode: "gb-eng", color: "#dc2626" };
const RVR = { ticker: "RVR", name: "Rovers", flagCode: "gb-eng", color: "#2563eb" };

function rcpt(p: Partial<ProofReceipt> & Pick<ProofReceipt, "pickId" | "result" | "points" | "marketLabel" | "settledAtMs">): ProofReceipt {
  return {
    predictionLabel: "x", home: ABL, away: RVR, homeScore: 1, awayScore: 1,
    fixtureId: "f", matchState: "FT", statKeys: "", payloadRef: "",
    merkleStatus: "valid", onChainStatus: "valid", txUrl: null,
    ...p,
  };
}

const find = (badges: Badge[], id: string) => badges.find((b) => b.id === id)!;

describe("buildBadges", () => {
  it("awards Chaos King and Underdog Prophet for a won high-reward chaos pick", () => {
    const badges = buildBadges([
      rcpt({ pickId: "a", result: "WON", points: 100, marketLabel: "chaos · late_goal", settledAtMs: 1 }),
    ]);
    expect(find(badges, "chaos_king").earned).toBe(true);
    expect(find(badges, "underdog_prophet").earned).toBe(true);
  });

  it("awards Clean Sheet Demon when a won pick involved a clean sheet", () => {
    const badges = buildBadges([
      rcpt({ pickId: "a", result: "WON", points: 40, marketLabel: "winner · away", settledAtMs: 1, homeScore: 0, awayScore: 2 }),
    ]);
    expect(find(badges, "clean_sheet_demon").earned).toBe(true);
  });

  it("locks badges with progress until thresholds are met", () => {
    const badges = buildBadges([
      rcpt({ pickId: "a", result: "WON", points: 30, marketLabel: "total_goals · O2.5", settledAtMs: 1 }),
      rcpt({ pickId: "b", result: "WON", points: 30, marketLabel: "total_goals · U2.5", settledAtMs: 2 }),
    ]);
    const gm = find(badges, "goal_machine");
    expect(gm.earned).toBe(false);
    expect(gm.progress).toEqual({ current: 2, target: 3 });
  });

  it("awards On Fire only at a 3-pick streak", () => {
    const wins = [1, 2, 3].map((n) =>
      rcpt({ pickId: `w${n}`, result: "WON", points: 10, marketLabel: "winner · home", settledAtMs: n }),
    );
    expect(find(buildBadges(wins), "on_fire").earned).toBe(true);

    const broken = [
      rcpt({ pickId: "w1", result: "WON", points: 10, marketLabel: "winner · home", settledAtMs: 1 }),
      rcpt({ pickId: "l", result: "LOST", points: 0, marketLabel: "winner · home", settledAtMs: 2 }),
      rcpt({ pickId: "w2", result: "WON", points: 10, marketLabel: "winner · home", settledAtMs: 3 }),
    ];
    expect(find(buildBadges(broken), "on_fire").earned).toBe(false);
  });
});
