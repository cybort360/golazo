import { describe, it, expect } from "vitest";
import {
  composeBroadcasts,
  applyEvent,
  type BroadcastState,
  type PostedRecord,
} from "@/lib/broadcast";
import type { MatchResult } from "@/hooks/useMatchResults";

function state(over: Partial<BroadcastState> = {}): BroadcastState {
  return { results: [], champion: null, ...over };
}

function emptyPosted(): PostedRecord {
  return { results: [], champion: null };
}

const braResult: MatchResult = {
  matchId: "GM006",
  winner: "BRA",
  loser: "MAR",
  isDraw: false,
  goalsWinner: 2,
  goalsLoser: 1,
  timestamp: 0,
  source: "api",
};

describe("composeBroadcasts — first run (anti-flood)", () => {
  it("posts nothing and seeds a baseline when there's no posted record", () => {
    const { events, baseline } = composeBroadcasts(
      state({ results: [braResult], champion: "ARG" }),
      null,
    );
    expect(events).toHaveLength(0);
    expect(baseline.results).toEqual(["GM006"]);
    expect(baseline.champion).toBe("ARG");
  });
});

describe("composeBroadcasts — diffing", () => {
  it("emits a result event the first time, then never again", () => {
    const first = composeBroadcasts(state({ results: [braResult] }), emptyPosted());
    expect(first.events.map((e) => e.type)).toEqual(["result"]);
    expect(first.events[0].text).toContain("2–1");

    const posted = applyEvent(emptyPosted(), first.events[0]);
    const second = composeBroadcasts(state({ results: [braResult] }), posted);
    expect(second.events).toHaveLength(0);
  });

  it("emits a champion event once", () => {
    const { events } = composeBroadcasts(state({ champion: "BRA" }), emptyPosted());
    expect(events.map((e) => e.type)).toEqual(["champion"]);
    const posted = applyEvent(emptyPosted(), events[0]);
    expect(composeBroadcasts(state({ champion: "BRA" }), posted).events).toHaveLength(0);
  });
});

describe("applyEvent", () => {
  it("records each event type in the posted record", () => {
    let posted = emptyPosted();
    posted = applyEvent(posted, { type: "result", id: "GM001", text: "" });
    posted = applyEvent(posted, { type: "champion", id: "BRA", text: "" });
    expect(posted).toEqual({
      results: ["GM001"],
      champion: "BRA",
    });
  });
});
