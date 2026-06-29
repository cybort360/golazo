import { describe, it, expect } from "vitest";
import {
  mapFixture,
  statusIdToState,
  mapStateSnapshot,
  snapshotToEvents,
  mapFinalResult,
  toMs,
  type RawFixture,
  type RawScoreRow,
} from "@/lib/txline/real/map";

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
    expect(r.available.winner).toBe(true);
    expect(r.available.corners).toBe(true);
    expect(r.available.chaos).toBe(false); // minutes unavailable from snapshot
    expect(r.goals).toEqual([]);
  });

  it("returns null while the match is still live", () => {
    expect(mapFinalResult(snapshot({ statusId: 4 }))).toBeNull();
  });
});
