import { describe, it, expect } from "vitest";
import { groupActivePicks, type ActivePickRow } from "@/lib/predict/picks-build";
import type { DbMatchRow } from "@/lib/predict/map";

function match(id: string, kickoff: number): DbMatchRow {
  return {
    id,
    competition: "World Cup",
    round: "Group A",
    homeTeam: "Home " + id,
    awayTeam: "Away " + id,
    homeTicker: "HOM",
    awayTicker: "AWY",
    homeFlag: "",
    awayFlag: "",
    homeColor: "#111",
    awayColor: "#222",
    kickoff,
    lockAt: kickoff,
    status: "NOT_STARTED",
    minute: null,
    homeScore: null,
    awayScore: null,
  };
}

function row(id: string, marketId: string, label: string, m: DbMatchRow): ActivePickRow {
  return { id, marketId, predictionLabel: label, createdAt: 0, match: m };
}

describe("groupActivePicks", () => {
  it("returns [] for no rows", () => {
    expect(groupActivePicks([])).toEqual([]);
  });

  it("groups picks by match and orders groups by soonest kickoff", () => {
    const early = match("A", 1000);
    const late = match("B", 5000);
    const groups = groupActivePicks([
      row("p1", "winner", "Home B", late),
      row("p2", "totals", "Over", early),
      row("p3", "btts", "Yes", early),
    ]);
    expect(groups.map((g) => g.match.id)).toEqual(["A", "B"]);
    expect(groups[0].picks).toHaveLength(2);
    expect(groups[1].picks).toHaveLength(1);
  });

  it("orders picks within a group by the fixed market order", () => {
    const m = match("A", 1000);
    const groups = groupActivePicks([
      row("p1", "chaos", "YES", m),
      row("p2", "winner", "Home A", m),
      row("p3", "btts", "No", m),
    ]);
    expect(groups[0].picks.map((p) => p.marketId)).toEqual(["winner", "btts", "chaos"]);
    expect(groups[0].picks[0].marketTitle).toBe("Match winner");
  });

  it("skips rows with an unknown market id", () => {
    const m = match("A", 1000);
    const groups = groupActivePicks([row("p1", "corners", "5+", m)]);
    expect(groups).toEqual([]);
  });
});
