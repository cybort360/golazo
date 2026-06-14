import { describe, it, expect } from "vitest";
import { scorePlayer, scoreLineup, zeroStats } from "@/lib/fpl/scoring";
import type { GameweekLineup, PlayerMatchStats, Position } from "@/lib/fpl/types";

function stats(over: Partial<PlayerMatchStats>): PlayerMatchStats {
  return { ...zeroStats(over.playerId ?? "p"), ...over };
}

describe("scorePlayer", () => {
  it("awards appearance points by minutes", () => {
    expect(scorePlayer("MID", stats({ minutes: 0 }))).toBe(0);
    expect(scorePlayer("MID", stats({ minutes: 45 }))).toBe(1);
    expect(scorePlayer("MID", stats({ minutes: 90 }))).toBe(2);
  });

  it("scores goals by position", () => {
    expect(scorePlayer("FWD", stats({ minutes: 90, goals: 1 }))).toBe(2 + 4);
    expect(scorePlayer("MID", stats({ minutes: 90, goals: 1 }))).toBe(2 + 5);
    expect(scorePlayer("DEF", stats({ minutes: 90, goals: 1 }))).toBe(2 + 6);
    expect(scorePlayer("GK", stats({ minutes: 90, goals: 1 }))).toBe(2 + 6);
  });

  it("adds assists", () => {
    expect(scorePlayer("FWD", stats({ minutes: 90, assists: 2 }))).toBe(2 + 6);
  });

  it("rewards clean sheets only for 60+ minutes and the right positions", () => {
    expect(scorePlayer("DEF", stats({ minutes: 90, cleanSheet: true }))).toBe(2 + 4);
    expect(scorePlayer("GK", stats({ minutes: 90, cleanSheet: true }))).toBe(2 + 4);
    expect(scorePlayer("MID", stats({ minutes: 90, cleanSheet: true }))).toBe(2 + 1);
    expect(scorePlayer("FWD", stats({ minutes: 90, cleanSheet: true }))).toBe(2);
    // under 60 minutes → no clean sheet
    expect(scorePlayer("DEF", stats({ minutes: 45, cleanSheet: true }))).toBe(1);
  });

  it("docks keepers/defenders a point per 2 conceded, others unaffected", () => {
    expect(scorePlayer("GK", stats({ minutes: 90, goalsConceded: 3 }))).toBe(2 - 1);
    expect(scorePlayer("DEF", stats({ minutes: 90, goalsConceded: 4 }))).toBe(2 - 2);
    expect(scorePlayer("MID", stats({ minutes: 90, goalsConceded: 4 }))).toBe(2);
  });

  it("subtracts cards and own goals", () => {
    expect(scorePlayer("MID", stats({ minutes: 90, yellowCards: 1 }))).toBe(2 - 1);
    expect(scorePlayer("MID", stats({ minutes: 90, redCards: 1 }))).toBe(2 - 3);
    expect(scorePlayer("DEF", stats({ minutes: 90, ownGoals: 1 }))).toBe(2 - 2);
  });

  it("combines a full stat line", () => {
    // 90' DEF, 1 goal, 1 assist, clean sheet, 1 yellow:
    // 2 + 6 + 3 + 4 - 1 = 14
    const pts = scorePlayer(
      "DEF",
      stats({ minutes: 90, goals: 1, assists: 1, cleanSheet: true, yellowCards: 1 }),
    );
    expect(pts).toBe(14);
  });
});

describe("scoreLineup", () => {
  const positions: Record<string, Position> = {
    gk: "GK", d1: "DEF", d2: "DEF", d3: "DEF",
    m1: "MID", m2: "MID", m3: "MID", m4: "MID",
    f1: "FWD", f2: "FWD", f3: "FWD",
    b1: "DEF", b2: "MID", b3: "GK", b4: "FWD",
  };
  const positionOf = (id: string) => positions[id];
  const lineup: GameweekLineup = {
    starters: ["gk", "d1", "d2", "d3", "m1", "m2", "m3", "m4", "f1", "f2", "f3"],
    bench: ["b3", "b1", "b2", "b4"],
    captain: "f1",
    viceCaptain: "m1",
  };

  it("doubles the captain and ignores the bench", () => {
    const byPlayer: Record<string, PlayerMatchStats> = {
      f1: stats({ playerId: "f1", minutes: 90, goals: 1 }), // 2+4 = 6, doubled = 12
      b1: stats({ playerId: "b1", minutes: 90, goals: 1 }), // benched → ignored
    };
    const { total, doubledPlayerId } = scoreLineup(lineup, positionOf, byPlayer);
    expect(doubledPlayerId).toBe("f1");
    // starters: f1=6, everyone else 0 → 6, plus captain double of 6 = 12
    expect(total).toBe(12);
  });

  it("falls back to the vice-captain when the captain didn't play", () => {
    const byPlayer: Record<string, PlayerMatchStats> = {
      f1: stats({ playerId: "f1", minutes: 0 }), // captain DNP
      m1: stats({ playerId: "m1", minutes: 90, goals: 1 }), // vice: 2+5 = 7
    };
    const { total, doubledPlayerId } = scoreLineup(lineup, positionOf, byPlayer);
    expect(doubledPlayerId).toBe("m1");
    expect(total).toBe(7 + 7); // base 7 + vice double 7
  });
});
