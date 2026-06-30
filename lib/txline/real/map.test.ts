import { describe, it, expect } from "vitest";
import {
  mapFixture,
  statusIdToState,
  mapStateSnapshot,
  snapshotToEvents,
  mapFinalResult,
  coerceRows,
  rowsToStreamEvents,
  toMs,
  type RawFixture,
  type RawScoreRow,
} from "@/lib/txline/real/map";
import { goalLogFromEvents, resolvePick, type MatchFinal } from "@/lib/predict/resolve";

const fixture: RawFixture = {
  Ts: 1_782_482_168_962,
  StartTime: 1_782_752_400_000,
  Competition: "World Cup",
  CompetitionId: 72,
  Participant1Id: 2161,
  Participant1: "Brazil",
  Participant2Id: 2530,
  Participant2: "Japan",
  FixtureId: 18172469,
  Participant1IsHome: true,
};

// Per-action snapshot rows (shape from the live devnet API, 2026-06-29).
// Brazil(P1, home) 2–1 Japan(P2), final, P1 4 corners / P2 1.
function snapshot(over: { statusId?: number; stats?: Record<string, number>; extra?: RawScoreRow[] } = {}): RawScoreRow[] {
  const stats = over.stats ?? { "1": 2, "2": 1, "7": 4, "8": 1 };
  return [
    { FixtureId: 18172469, Participant1IsHome: true, Action: "comment", Ts: 1, Seq: 1, Data: {}, Stats: {} },
    { FixtureId: 18172469, Participant1IsHome: true, Action: "status", Ts: 5, Seq: 50, Data: { StatusId: over.statusId ?? 5 } },
    { FixtureId: 18172469, Participant1IsHome: true, Action: "possession", Ts: 9, Seq: 99, Data: { New: { Clock: { Seconds: 5400 } } }, Stats: stats },
    ...(over.extra ?? []),
  ];
}

describe("statusIdToState", () => {
  it("maps soccer status ids to coarse state", () => {
    expect(statusIdToState(1)).toBe("NOT_STARTED");
    expect(statusIdToState(2)).toBe("LIVE");
    expect(statusIdToState(3)).toBe("HT");
    expect(statusIdToState(4)).toBe("LIVE");
    expect(statusIdToState(5)).toBe("FT");
    expect(statusIdToState(10)).toBe("FT");
    expect(statusIdToState(undefined)).toBe("NOT_STARTED");
  });
});

describe("toMs", () => {
  it("passes ms through and upscales seconds", () => {
    expect(toMs(1_782_752_400_000)).toBe(1_782_752_400_000);
    expect(toMs(1_782_752_400)).toBe(1_782_752_400_000);
  });
});

describe("mapFixture", () => {
  it("orients home/away by Participant1IsHome and derives tickers", () => {
    const f = mapFixture(fixture);
    expect(f.id).toBe("18172469");
    expect(f.competition).toBe("World Cup");
    expect(f.home.name).toBe("Brazil");
    expect(f.home.ticker).toBe("BRA");
    expect(f.away.name).toBe("Japan");
    expect(f.away.ticker).toBe("JAP");
    expect(f.lockMs).toBe(f.kickoffMs);
  });

  it("flips home/away when participant1 is the away side", () => {
    const f = mapFixture({ ...fixture, Participant1IsHome: false });
    expect(f.home.name).toBe("Japan");
    expect(f.away.name).toBe("Brazil");
  });
});

describe("mapStateSnapshot", () => {
  it("reads phase from the status action and scores from Stats", () => {
    const snap = mapStateSnapshot(snapshot({ statusId: 4, stats: { "1": 1, "2": 1 } }))!;
    expect(snap.state).toBe("LIVE");
    expect(snap.homeScore).toBe(1);
    expect(snap.awayScore).toBe(1);
    expect(snap.minute).toBe(90); // 5400s / 60
  });

  it("orients scores to away when participant1 is away", () => {
    const rows = snapshot({ statusId: 4 }).map((r) => ({ ...r, Participant1IsHome: false }));
    const snap = mapStateSnapshot(rows)!;
    expect(snap.homeScore).toBe(1); // P2 goals → home
    expect(snap.awayScore).toBe(2);
  });

  it("returns null for no rows", () => {
    expect(mapStateSnapshot([])).toBeNull();
  });
});

describe("snapshotToEvents", () => {
  it("emits one current-state event, gated by sinceSeq", () => {
    const ev = snapshotToEvents(snapshot());
    expect(ev).toHaveLength(1);
    expect(ev[0].type).toBe("ft");
    expect(ev[0].seq).toBe(99);
    expect(ev[0].homeScore).toBe(2);
    expect(snapshotToEvents(snapshot(), 99)).toHaveLength(0); // already ingested
  });
});

describe("mapFinalResult", () => {
  it("builds a final result with stats + availability when FT", () => {
    const r = mapFinalResult(snapshot({ statusId: 5 }))!;
    expect(r.state).toBe("FT");
    expect(r.homeScore).toBe(2);
    expect(r.awayScore).toBe(1);
    expect(r.stats.home_corners).toBe(4);
    expect(r.stats.total_goals).toBe(3);
    // availability is keyed by the stat each market needs (see state.ts)
    expect(r.available.home_goals).toBe(true);
    expect(r.available.total_goals).toBe(true);
    expect(r.available.btts).toBe(true);
    expect(r.available.late_goal).toBe(false); // goal minutes not in snapshot; settle enriches
    expect(r.goals).toEqual([]);
  });

  it("returns null while the match is still live", () => {
    expect(mapFinalResult(snapshot({ statusId: 4 }))).toBeNull();
  });
});

describe("rowsToStreamEvents (goal-minute extraction)", () => {
  // Brazil(P1, home). status H2 live, clock 83', then P1 scores (Stats "1": 1).
  function liveRows(): RawScoreRow[] {
    return [
      { FixtureId: 1, Participant1IsHome: true, Action: "status", Ts: 1, Seq: 10, Data: { StatusId: 4 } },
      { FixtureId: 1, Participant1IsHome: true, Action: "possession", Ts: 2, Seq: 20, Data: { Clock: { Seconds: 4980 } }, Stats: { "1": 0, "2": 0 } },
      { FixtureId: 1, Participant1IsHome: true, Action: "goal", Ts: 3, Seq: 30, Data: { Clock: { Seconds: 4980 } }, Stats: { "1": 1, "2": 0 } },
    ];
  }

  it("emits a goal event with the minute the goal was scored", () => {
    const events = rowsToStreamEvents(liveRows());
    const goal = events.find((e) => e.type === "goal")!;
    expect(goal).toBeDefined();
    expect(goal.minute).toBe(83); // 4980s / 60
    expect(goal.team).toBe("home"); // P1 is home and P1's tally rose
    expect(goal.homeScore).toBe(1);
    expect(goal.seq).toBe(30);
  });

  it("orients the scoring team by Participant1IsHome", () => {
    const rows = liveRows().map((r) => ({ ...r, Participant1IsHome: false }));
    const goal = rowsToStreamEvents(rows).find((e) => e.type === "goal")!;
    expect(goal.team).toBe("away"); // P1 scored but P1 is away
  });

  it("does not re-emit goals already seen (sinceSeq)", () => {
    const events = rowsToStreamEvents(liveRows(), 30);
    expect(events.find((e) => e.type === "goal")).toBeUndefined();
  });

  it("is idempotent — re-deriving yields the same goal seqs", () => {
    const a = rowsToStreamEvents(liveRows()).filter((e) => e.type === "goal").map((e) => e.seq);
    const b = rowsToStreamEvents(liveRows()).filter((e) => e.type === "goal").map((e) => e.seq);
    expect(a).toEqual(b);
  });

  it("chains end-to-end: SSE rows → stored events → goal log → Chaos resolves", () => {
    // The shape rowsToStreamEvents emits is exactly what storeEvents persists and
    // goalLogFromEvents reads back, so a late goal (83') unlocks the Chaos market.
    const events = rowsToStreamEvents(liveRows());
    const goals = goalLogFromEvents(events);
    const final: MatchFinal = { state: "FT", homeScore: 1, awayScore: 0, goals };
    expect(resolvePick(final, "chaos", "yes")).toBe("WON");
  });
});

describe("coerceRows (SSE frame normalization)", () => {
  const row: RawScoreRow = { FixtureId: 18172469, Participant1IsHome: true, Action: "goal", Ts: 7, Seq: 70, Stats: { "1": 1, "2": 0 } };

  it("wraps a single row object", () => {
    expect(coerceRows(row)).toEqual([row]);
  });

  it("passes through an array of rows", () => {
    expect(coerceRows([row, row])).toEqual([row, row]);
  });

  it("unwraps common batch envelopes", () => {
    expect(coerceRows({ rows: [row] })).toEqual([row]);
    expect(coerceRows({ updates: [row] })).toEqual([row]);
  });

  it("drops non-row payloads (keep-alives, junk)", () => {
    expect(coerceRows(null)).toEqual([]);
    expect(coerceRows({ ping: true })).toEqual([]);
    expect(coerceRows([{ nope: 1 }])).toEqual([]);
    expect(coerceRows("heartbeat")).toEqual([]);
  });
});
