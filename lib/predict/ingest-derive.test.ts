import { describe, it, expect } from "vitest";
import { latestEventPatch } from "@/lib/predict/ingest-derive";

describe("latestEventPatch", () => {
  it("returns null for an empty log", () => {
    expect(latestEventPatch([])).toBeNull();
  });

  it("derives state from the highest-seq event regardless of input order", () => {
    const patch = latestEventPatch([
      { seq: 1, state: "LIVE", minute: 0, homeScore: 0, awayScore: 0 },
      { seq: 3, state: "FT", minute: 90, homeScore: 2, awayScore: 1 },
      { seq: 2, state: "LIVE", minute: 40, homeScore: 1, awayScore: 0 },
    ]);
    expect(patch).toEqual({ status: "FT", minute: 90, homeScore: 2, awayScore: 1 });
  });

  it("reflects a live in-progress score", () => {
    const patch = latestEventPatch([
      { seq: 1, state: "LIVE", minute: 0, homeScore: 0, awayScore: 0 },
      { seq: 2, state: "LIVE", minute: 40, homeScore: 1, awayScore: 0 },
    ]);
    expect(patch).toEqual({ status: "LIVE", minute: 40, homeScore: 1, awayScore: 0 });
  });
});
