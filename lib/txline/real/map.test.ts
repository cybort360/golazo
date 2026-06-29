import { describe, it, expect } from "vitest";
import {
  mapFixture,
  mapState,
  mapStateSnapshot,
  mapEvent,
  mapFinalResult,
  toMs,
  type RawFixture,
  type RawScores,
} from "@/lib/txline/real/map";

const fixture: RawFixture = {
  Ts: 1_750_000_000_000,
  StartTime: 1_750_000_500_000,
  Competition: "World Cup 2026",
  CompetitionId: 17,
  Participant1Id: 100,
  Participant1: "Brazil",
  Participant2Id: 200,
  Participant2: "Argentina",
  FixtureId: 9001,
  Participant1IsHome: true,
};

// Argentina (p2) away; BRA 2–1 ARG; p1 is home.
function scoresRow(over: Partial<RawScores>): RawScores {
  return {
    fixtureId: 9001,
    gameState: "F",
    startTime: 1_750_000_500_000,
    participant1IsHome: true,
    participant1Id: 100,
    participant2Id: 200,
    action: "score",
    id: 1,
    ts: 1_750_010_000_000,
    seq: 10,
    scoreSoccer: {
      Participant1: { Total: { Goals: 2, YellowCards: 1, RedCards: 0, Corners: 6 } },
      Participant2: { Total: { Goals: 1, YellowCards: 2, RedCards: 0, Corners: 3 } },
    },
    ...over,
  };
}

describe("mapState", () => {
  it("maps soccer phase codes to coarse state", () => {
    expect(mapState("NS")).toBe("NOT_STARTED");
    expect(mapState("H1")).toBe("LIVE");
    expect(mapState("HT")).toBe("HT");
    expect(mapState("F")).toBe("FT");
    expect(mapState("FET")).toBe("FT");
    expect(mapState("P")).toBe("POSTPONED");
    expect(mapState("A")).toBe("VOID");
  });
});

describe("toMs", () => {
  it("passes through milliseconds and upscales seconds", () => {
    expect(toMs(1_750_000_000_000)).toBe(1_750_000_000_000);
    expect(toMs(1_750_000_000)).toBe(1_750_000_000_000);
  });
});

describe("mapFixture", () => {
  it("orients home/away by Participant1IsHome and derives tickers", () => {
    const f = mapFixture(fixture);
    expect(f.id).toBe("9001");
    expect(f.competition).toBe("World Cup 2026");
    expect(f.home.name).toBe("Brazil");
    expect(f.home.ticker).toBe("BRA");
    expect(f.away.name).toBe("Argentina");
    expect(f.away.ticker).toBe("ARG");
    expect(f.lockMs).toBe(f.kickoffMs);
  });

  it("flips home/away when participant1 is the away side", () => {
    const f = mapFixture({ ...fixture, Participant1IsHome: false });
    expect(f.home.name).toBe("Argentina");
    expect(f.away.name).toBe("Brazil");
  });
});

describe("mapStateSnapshot", () => {
  it("orients scores to home/away and carries the minute", () => {
    const snap = mapStateSnapshot(scoresRow({ gameState: "H2", dataSoccer: { Minutes: 67 } }));
    expect(snap.state).toBe("LIVE");
    expect(snap.minute).toBe(67);
    expect(snap.homeScore).toBe(2);
    expect(snap.awayScore).toBe(1);
  });

  it("flips orientation when participant1 is away", () => {
    const snap = mapStateSnapshot(scoresRow({ participant1IsHome: false }));
    expect(snap.homeScore).toBe(1); // p2 (away in the row) becomes home
    expect(snap.awayScore).toBe(2);
  });
});

describe("mapEvent", () => {
  it("flags a home goal and its minute", () => {
    const e = mapEvent(scoresRow({ gameState: "H2", dataSoccer: { Goal: true, Minutes: 87, Participant: 1 } }));
    expect(e.type).toBe("goal");
    expect(e.team).toBe("home");
    expect(e.minute).toBe(87);
    expect(e.seq).toBe(10);
  });

  it("attributes a participant2 goal to away", () => {
    const e = mapEvent(scoresRow({ gameState: "H2", dataSoccer: { Goal: true, Minutes: 40, Participant: 2 } }));
    expect(e.team).toBe("away");
  });
});

describe("mapFinalResult", () => {
  it("derives goals, stats, availability and proof fields", () => {
    const snapshot = scoresRow({ gameState: "F" });
    const goalEvents: RawScores[] = [
      scoresRow({ seq: 3, dataSoccer: { Goal: true, Minutes: 23, Participant: 1 } }),
      scoresRow({ seq: 5, dataSoccer: { Goal: true, Minutes: 55, Participant: 2 } }),
      scoresRow({ seq: 8, dataSoccer: { Goal: true, Minutes: 87, Participant: 1 } }),
    ];
    const proof = { ts: 1_750_010_500_000, statToProve: { key: 1, value: 2, period: 0 }, eventStatRoot: "bWVya2xl" };
    const r = mapFinalResult(snapshot, goalEvents, proof);

    expect(r.state).toBe("FT");
    expect(r.homeScore).toBe(2);
    expect(r.awayScore).toBe(1);
    expect(r.goals).toHaveLength(3);
    expect(r.goals.some((g) => g.minute === 87 && g.team === "home")).toBe(true); // chaos: after 80'
    expect(r.stats.home_corners).toBe(6);
    expect(r.available.chaos).toBe(true);
    expect(r.available.corners).toBe(true);
    expect(r.merkleRoot).toBe("bWVya2xl");
    expect(r.settledAtMs).toBe(1_750_010_500_000);
  });

  it("marks chaos unavailable without the goal-event trail", () => {
    const r = mapFinalResult(scoresRow({ gameState: "F" }), [], null);
    expect(r.available.chaos).toBe(false);
    expect(r.merkleRoot).toBeNull();
  });
});
