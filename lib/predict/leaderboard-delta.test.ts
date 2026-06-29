import { describe, it, expect } from "vitest";
import { computeDelta, movementLabel } from "@/lib/predict/leaderboard-delta";
import { rankStandings, type RankedMember } from "@/lib/predict/league-util";

function members(rows: { userId: string; name: string; points: number }[]): RankedMember[] {
  return rankStandings(rows.map((r) => ({ ...r, won: 0, settled: 0 })));
}

describe("computeDelta", () => {
  it("reports the rise when a winning pick overtakes a rival", () => {
    // After the pick: you 170, rival 150 → you #1. The pick was worth 40, so
    // before it you had 130 and sat behind the rival at #2.
    const m = members([
      { userId: "you", name: "You", points: 170 },
      { userId: "riv", name: "Riv", points: 150 },
    ]);
    const d = computeDelta(m, "you", 40)!;
    expect(d.rank).toBe(1);
    expect(d.previousRank).toBe(2);
    expect(movementLabel(d)).toBe("up to #1");
  });

  it("holds rank when already on top and still ahead without the pick", () => {
    const m = members([
      { userId: "you", name: "You", points: 200 },
      { userId: "riv", name: "Riv", points: 80 },
    ]);
    const d = computeDelta(m, "you", 40)!;
    expect(d.rank).toBe(1);
    expect(d.previousRank).toBe(1);
    expect(movementLabel(d)).toBe("held #1");
  });

  it("does not move on a losing/void pick (0 points)", () => {
    const m = members([
      { userId: "riv", name: "Riv", points: 150 },
      { userId: "you", name: "You", points: 130 },
    ]);
    const d = computeDelta(m, "you", 0)!;
    expect(d.rank).toBe(2);
    expect(d.previousRank).toBe(2);
    expect(movementLabel(d)).toBe("now #2");
  });

  it("returns null when the user is not a league member", () => {
    const m = members([{ userId: "riv", name: "Riv", points: 10 }]);
    expect(computeDelta(m, "you", 40)).toBeNull();
  });
});
