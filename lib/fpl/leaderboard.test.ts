import { describe, it, expect } from "vitest";
import { buildFantasyLeaderboard } from "@/lib/fpl/leaderboard";
import { zeroStats } from "@/lib/fpl/scoring";
import type {
  FplPlayer,
  FplTeam,
  Gameweek,
  GameweekLineup,
  PlayerMatchStats,
} from "@/lib/fpl/types";

// Pool big enough for an 11 + 4 bench. The leaderboard scorer only reads the
// starters and the captain, so exact composition/legality doesn't matter here —
// that's validated at the route layer.
const pool: FplPlayer[] = [
  ["gk", "GK"], ["d1", "DEF"], ["d2", "DEF"], ["d3", "DEF"], ["d4", "DEF"], ["d5", "DEF"],
  ["m1", "MID"], ["m2", "MID"], ["m3", "MID"], ["m4", "MID"], ["m5", "MID"],
  ["f1", "FWD"], ["f2", "FWD"], ["f3", "FWD"], ["f4", "FWD"],
].map(([id, position]) => ({
  id, name: id, team: "AAA", position: position as FplPlayer["position"], price: 5,
}));

const lineup: GameweekLineup = {
  starters: ["gk", "d1", "d2", "d3", "m1", "m2", "m3", "m4", "f1", "f2", "f3"],
  bench: ["d4", "d5", "m5", "f4"],
  captain: "f1",
  viceCaptain: "m1",
};

const gw: Gameweek = { id: "GW1", label: "GW1", matchIds: ["GM001"], deadlineMs: 0 };

function statline(playerId: string, over: Partial<PlayerMatchStats>): PlayerMatchStats {
  return { ...zeroStats(playerId), ...over };
}

describe("buildFantasyLeaderboard", () => {
  it("sums net gameweek points and ranks managers", () => {
    const squad = pool.map((p) => p.id);
    const teamA: FplTeam = {
      playerId: "A", name: "Alpha", squad, createdAt: 0,
      lineups: { GW1: lineup }, transfersByGw: {},
    };
    const teamB: FplTeam = {
      playerId: "B", name: "Bravo", squad, createdAt: 0,
      lineups: { GW1: lineup },
      transfersByGw: { GW1: 2 }, // one extra transfer → -4 hit
    };

    const statsByMatch: Record<string, PlayerMatchStats[]> = {
      GM001: [statline("f1", { minutes: 90, goals: 1 })], // f1: 2+4=6, captain → 12
    };

    const rows = buildFantasyLeaderboard([teamA, teamB], pool, statsByMatch, [gw]);
    expect(rows[0]).toMatchObject({ name: "Alpha", points: 12 });
    expect(rows[1]).toMatchObject({ name: "Bravo", points: 8 }); // 12 - 4 hit
  });

  it("skips gameweeks a manager didn't field a lineup for", () => {
    const team: FplTeam = {
      playerId: "A", name: "Alpha", squad: pool.map((p) => p.id),
      createdAt: 0, lineups: {}, transfersByGw: {},
    };
    const rows = buildFantasyLeaderboard([team], pool, {}, [gw]);
    expect(rows[0].points).toBe(0);
    expect(rows[0].gwPoints).toEqual({});
  });
});
