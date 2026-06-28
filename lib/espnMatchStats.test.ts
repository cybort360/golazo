import { describe, it, expect } from "vitest";
import { parseEspnGoals } from "@/lib/espnMatchStats";

describe("parseEspnGoals", () => {
  // Home: a goal (assisted), a penalty. Away: an own goal (credits Home).
  const raw = {
    rosters: [
      {
        team: { abbreviation: "HOM" },
        roster: [
          { athlete: { shortName: "Scorer" }, plays: [
            { scoringPlay: true, didScore: true, clock: { displayValue: "51'" } },
          ] },
          { athlete: { shortName: "Assister" }, plays: [
            { scoringPlay: true, didScore: false, clock: { displayValue: "51'" } },
          ] },
          { athlete: { shortName: "Pentaker" }, plays: [
            { scoringPlay: true, didScore: true, penaltyKick: true, clock: { displayValue: "70'" } },
          ] },
        ],
      },
      {
        team: { abbreviation: "AWY" },
        roster: [
          { athlete: { shortName: "OwnGoaler" }, plays: [
            { scoringPlay: true, ownGoal: true, clock: { displayValue: "30'" } },
          ] },
        ],
      },
    ],
  };

  const goals = parseEspnGoals(raw);

  it("counts the scorer, not the assister", () => {
    expect(goals.some((g) => g.scorer === "Assister")).toBe(false);
    expect(goals.some((g) => g.scorer === "Scorer")).toBe(true);
  });

  it("credits an own goal to the opponent and flags it", () => {
    const og = goals.find((g) => g.scorer === "OwnGoaler");
    expect(og).toMatchObject({ team: "HOM", ownGoal: true });
  });

  it("flags penalties and sorts by minute", () => {
    expect(goals.map((g) => g.scorer)).toEqual(["OwnGoaler", "Scorer", "Pentaker"]);
    expect(goals.find((g) => g.scorer === "Pentaker")?.penalty).toBe(true);
  });
});
