import { describe, it, expect } from "vitest";
import { parseEspnSummary, parseEspnGoals } from "@/lib/espnMatchStats";

// Home beat Away 1–0. H1 scored (90'), H2 assisted then subbed off at 60', the
// home keeper kept a clean sheet; on Away, a sub (A2) came on at 75' and put
// through his own net (so Away "scored" 0 from open play but conceded the OG).
const raw = {
  rosters: [
    {
      homeAway: "home",
      team: { abbreviation: "HOM" },
      roster: [
        { athlete: { id: "1" }, starter: true, stats: [
          { name: "totalGoals", value: 1 }, { name: "yellowCards", value: 1 },
        ], plays: [] },
        { athlete: { id: "2" }, starter: true, subbedOut: true, stats: [
          { name: "goalAssists", value: 1 },
        ], plays: [{ substitution: true, clock: { displayValue: "60'" } }] },
        { athlete: { id: "3" }, starter: true, stats: [{ name: "saves", value: 5 }], plays: [] },
      ],
    },
    {
      homeAway: "away",
      team: { abbreviation: "AWY" },
      roster: [
        { athlete: { id: "10" }, starter: true, stats: [], plays: [] },
        { athlete: { id: "11" }, subbedIn: true, stats: [{ name: "ownGoals", value: 1 }],
          plays: [{ substitution: true, clock: { displayValue: "75'" } }] },
      ],
    },
  ],
};

describe("parseEspnSummary", () => {
  const byId = Object.fromEntries(parseEspnSummary(raw).map((s) => [s.playerId, s]));

  it("reads goals, assists, and cards", () => {
    expect(byId["1"].goals).toBe(1);
    expect(byId["1"].yellowCards).toBe(1);
    expect(byId["2"].assists).toBe(1);
    expect(byId["11"].ownGoals).toBe(1);
  });

  it("derives minutes from starter + substitution clock", () => {
    expect(byId["1"].minutes).toBe(90); // started, not subbed
    expect(byId["2"].minutes).toBe(60); // subbed off at 60'
    expect(byId["11"].minutes).toBe(15); // came on at 75'
  });

  it("computes clean sheets and goals conceded from the opponent (and own goals)", () => {
    // Home conceded 0 → clean sheet.
    expect(byId["1"].cleanSheet).toBe(true);
    expect(byId["1"].goalsConceded).toBe(0);
    // Away conceded the home goal + their own goal = 2 → no clean sheet.
    expect(byId["10"].cleanSheet).toBe(false);
    expect(byId["10"].goalsConceded).toBe(2);
  });

  it("never throws on an empty payload", () => {
    expect(parseEspnSummary({})).toEqual([]);
  });
});

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
