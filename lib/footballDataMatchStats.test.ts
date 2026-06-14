import { describe, it, expect } from "vitest";
import { parseMatchStats } from "@/lib/footballDataMatchStats";

// Home (id 1) beat Away (id 2) 2–0. p10 scored (assisted by p11) then was subbed
// off at 60' for p12; p20 (away) put through his own net and was booked.
const raw = {
  homeTeam: {
    id: 1,
    lineup: [{ id: 10, name: "p10" }, { id: 11, name: "p11" }],
    bench: [{ id: 12, name: "p12" }, { id: 13, name: "p13" }],
  },
  awayTeam: { id: 2, lineup: [{ id: 20, name: "p20" }], bench: [] },
  score: { fullTime: { home: 2, away: 0 } },
  goals: [
    { type: "REGULAR", team: { id: 1 }, scorer: { id: 10 }, assist: { id: 11 } },
    { type: "OWN", team: { id: 1 }, scorer: { id: 20 }, assist: null },
  ],
  bookings: [{ team: { id: 2 }, player: { id: 20 }, card: "YELLOW" }],
  substitutions: [
    { minute: 60, team: { id: 1 }, playerOut: { id: 10 }, playerIn: { id: 12 } },
  ],
};

describe("parseMatchStats", () => {
  const byId = Object.fromEntries(parseMatchStats(raw).map((s) => [s.playerId, s]));

  it("derives minutes from starts and substitutions", () => {
    expect(byId["10"].minutes).toBe(60); // subbed off at 60
    expect(byId["11"].minutes).toBe(90); // played the full match
    expect(byId["12"].minutes).toBe(30); // on at 60
  });

  it("omits an unused substitute", () => {
    expect(byId["13"]).toBeUndefined();
  });

  it("credits goals and assists, and an own goal to the right player", () => {
    expect(byId["10"].goals).toBe(1);
    expect(byId["11"].assists).toBe(1);
    expect(byId["20"].ownGoals).toBe(1);
    expect(byId["20"].goals).toBe(0);
  });

  it("flags clean sheets and goals conceded by team", () => {
    expect(byId["10"].cleanSheet).toBe(true); // home conceded 0
    expect(byId["10"].goalsConceded).toBe(0);
    expect(byId["20"].cleanSheet).toBe(false); // away conceded 2
    expect(byId["20"].goalsConceded).toBe(2);
  });

  it("records cards", () => {
    expect(byId["20"].yellowCards).toBe(1);
  });

  it("never throws on an empty payload", () => {
    expect(parseMatchStats({})).toEqual([]);
  });
});
