import { describe, it, expect } from "vitest";
import { computeStandings, deriveTeamStatuses } from "@/lib/standings";
import { SCHEDULE } from "@/constants/schedule";
import type { MatchResult } from "@/hooks/useMatchResults";

function decisive(
  matchId: string,
  winner: string,
  loser: string,
  goalsWinner: number,
  goalsLoser: number,
): MatchResult {
  return {
    matchId,
    winner,
    loser,
    isDraw: false,
    goalsWinner,
    goalsLoser,
    timestamp: 0,
    source: "api",
  };
}

describe("computeStandings — ordering", () => {
  it("breaks a points tie by goal difference", () => {
    // GM001 = MEX v RSA, GM002 = KOR v CZE (both in Group A).
    const results = [
      decisive("GM001", "MEX", "RSA", 1, 0), // MEX +1
      decisive("GM002", "KOR", "CZE", 5, 0), // KOR +5
    ];
    const order = computeStandings(results)
      .byGroup.get("A")!
      .map((s) => s.team.ticker);
    // KOR and MEX both 3 pts / 1 win; KOR's better GD ranks it first. The
    // winless RSA (-1) still edges CZE (-5).
    expect(order).toEqual(["KOR", "MEX", "RSA", "CZE"]);
  });

  it("breaks a points + GD tie by goals scored", () => {
    const results = [
      decisive("GM001", "MEX", "RSA", 2, 1), // MEX +1, GF 2
      decisive("GM002", "KOR", "CZE", 1, 0), // KOR +1, GF 1
    ];
    const order = computeStandings(results)
      .byGroup.get("A")!
      .map((s) => s.team.ticker);
    expect(order).toEqual(["MEX", "KOR", "RSA", "CZE"]);
  });

  it("accumulates goals for and against on both teams", () => {
    const standing = computeStandings([decisive("GM001", "MEX", "RSA", 3, 1)])
      .byGroup.get("A")!
      .find((s) => s.team.ticker === "MEX")!;
    expect(standing.goalsFor).toBe(3);
    expect(standing.goalsAgainst).toBe(1);
    expect(standing.goalDiff).toBe(2);
    expect(standing.points).toBe(3);
  });

  it("flags a group complete only after all six matches", () => {
    const groupA = SCHEDULE.filter((m) => m.groupOrRound === "Group A");
    expect(groupA).toHaveLength(6);
    const five = groupA
      .slice(0, 5)
      .map((m) => decisive(m.id, m.teamA, m.teamB, 1, 0));
    expect(computeStandings(five).groupComplete.get("A")).toBe(false);
    const all = groupA.map((m) => decisive(m.id, m.teamA, m.teamB, 1, 0));
    expect(computeStandings(all).groupComplete.get("A")).toBe(true);
  });
});

// Build a full, completed Group A with a clean 9/6/3/0 table via a priority
// ranking, independent of how the six fixtures pair the teams.
function completedGroupA(): MatchResult[] {
  const priority: Record<string, number> = { MEX: 4, RSA: 3, KOR: 2, CZE: 1 };
  return SCHEDULE.filter((m) => m.groupOrRound === "Group A").map((m) => {
    const aWins = priority[m.teamA] > priority[m.teamB];
    return decisive(
      m.id,
      aWins ? m.teamA : m.teamB,
      aWins ? m.teamB : m.teamA,
      2,
      0,
    );
  });
}

describe("deriveTeamStatuses", () => {
  it("eliminates the 4th-placed team once its group is complete", () => {
    const status = deriveTeamStatuses(completedGroupA(), null);
    expect(status.get("CZE")).toBe("eliminated"); // 4th
  });

  it("does not eliminate a 3rd-placed team until every group is complete", () => {
    // Only Group A is complete, so the best-third ranking isn't final yet.
    const status = deriveTeamStatuses(completedGroupA(), null);
    expect(status.get("KOR")).toBe("active"); // 3rd, still in limbo
    expect(status.get("MEX")).toBe("active");
    expect(status.get("RSA")).toBe("active");
  });

  it("eliminates the loser of a knockout match", () => {
    const status = deriveTeamStatuses(
      [decisive("GM073", "BRA", "ARG", 1, 0)],
      null,
    );
    expect(status.get("ARG")).toBe("eliminated");
    expect(status.get("BRA")).toBe("active");
  });

  it("marks the champion", () => {
    const status = deriveTeamStatuses([], "BRA");
    expect(status.get("BRA")).toBe("champion");
  });
});
