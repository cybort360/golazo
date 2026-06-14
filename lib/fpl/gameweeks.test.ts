import { describe, it, expect } from "vitest";
import {
  buildGameweeks,
  gameweekForMatch,
  upcomingGameweek,
  activeGameweek,
} from "@/lib/fpl/gameweeks";
import { SCHEDULE } from "@/constants/schedule";

const gws = buildGameweeks();

describe("buildGameweeks", () => {
  it("produces 8 gameweeks: 3 group matchdays + 5 knockout rounds", () => {
    expect(gws.map((g) => g.id)).toEqual([
      "GW1", "GW2", "GW3", "GW4", "GW5", "GW6", "GW7", "GW8",
    ]);
  });

  it("puts 24 group matches in each group matchday", () => {
    for (const id of ["GW1", "GW2", "GW3"]) {
      const gw = gws.find((g) => g.id === id)!;
      expect(gw.matchIds).toHaveLength(24);
    }
  });

  it("bundles the third-place match with the final", () => {
    const final = gws.find((g) => g.id === "GW8")!;
    expect(final.matchIds).toHaveLength(2);
    expect(final.label).toBe("Final");
  });

  it("covers every match exactly once", () => {
    const all = gws.flatMap((g) => g.matchIds);
    expect(all).toHaveLength(SCHEDULE.length);
    expect(new Set(all).size).toBe(SCHEDULE.length);
  });

  it("orders gameweeks by deadline", () => {
    for (let i = 1; i < gws.length; i++) {
      expect(gws[i].deadlineMs).toBeGreaterThanOrEqual(gws[i - 1].deadlineMs);
    }
  });
});

describe("gameweek lookups", () => {
  it("maps a known group fixture to its matchday", () => {
    // GM001 is the tournament opener → first group matchday.
    expect(gameweekForMatch("GM001", gws)?.id).toBe("GW1");
  });

  it("upcomingGameweek picks the first deadline still in the future", () => {
    const beforeAll = gws[0].deadlineMs - 1;
    expect(upcomingGameweek(beforeAll, gws)?.id).toBe("GW1");
    const afterAll = gws[gws.length - 1].deadlineMs + 1;
    expect(upcomingGameweek(afterAll, gws)).toBeNull();
  });

  it("activeGameweek picks the most recent deadline that has passed", () => {
    expect(activeGameweek(gws[0].deadlineMs - 1, gws)).toBeNull();
    expect(activeGameweek(gws[2].deadlineMs, gws)?.id).toBe("GW3");
  });
});
